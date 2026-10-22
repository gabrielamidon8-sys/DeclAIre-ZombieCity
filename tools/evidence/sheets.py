import json, textwrap, os, re, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import patches
from PIL import Image
import os; D = os.path.dirname(os.path.abspath(__file__))
EV = D + '/ev'
OUT = D + '/sheets'; os.makedirs(OUT, exist_ok=True)
C = json.load(open(D + '/course.json'))
ENG = {e['name']: e for e in C['eng']}
BRD = json.load(open(EV + '/_res_u2.json'))['brd_data']
FX = json.loads(open(D + '/fxdata.txt').read().split('\nERRS')[0])
MOVES = json.load(open(EV + '/_res_l.json'))['ch_moves']
BG, FG, DIM, GRID = '#0f1115', '#ece9e2', '#9aa0a8', '#2a2e35'
ACC = {'LEGEND': '#ff6b5e', 'MIMATIC': '#ffb347', 'VFXRAY': '#3de8ff', 'CHOREO': '#7bd88f', 'BOARD': '#e9d9b0'}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'text.color': FG, 'axes.edgecolor': '#555b63', 'axes.labelcolor': DIM, 'xtick.color': DIM, 'ytick.color': DIM, 'axes.facecolor': '#151820', 'savefig.facecolor': BG, 'font.size': 10})

def wrap(s, n): return textwrap.wrap(s, n) or ['']

def text_block(fig, x, y, lines, size=10, color=FG, weight='normal', lh=1.42, family=None):
    # lines: list of strings; returns the new y (figure fraction)
    H = fig.get_figheight() * 72
    for ln in lines:
        fig.text(x, y, ln, fontsize=size, color=color, weight=weight, va='top', family=family or 'DejaVu Sans')
        y -= size * lh / H
    return y

def img_axes(fig, path, box, caption=None, acc=FG):
    # fit an image in a box (x, y, w, h in figure fractions), top-aligned; returns the bottom y used
    im = Image.open(path).convert('RGB'); iw, ih = im.size
    W, H = fig.get_figwidth(), fig.get_figheight()
    x, y, w, h = box; capH = (0.026 if caption else 0)
    bw, bh = w * W, (h - capH) * H
    s = min(bw / iw, bh / ih); dw, dh = iw * s / W, ih * s / H
    ax = fig.add_axes([x, y + h - dh - capH, dw, dh]); ax.imshow(im); ax.axis('off')
    if caption:
        for k, ln in enumerate(wrap(caption, int(dw * W * 72 / 6.0))[:2]): fig.text(x, y + h - dh - capH - 0.004 - k * 0.016, ln, fontsize=9.2, color=DIM, va='top')
    return y + h - dh - capH - 0.036

def style(ax, title=None):
    ax.set_facecolor('#151820'); ax.grid(True, color=GRID, lw=0.6); ax.tick_params(labelsize=8.5)
    for s in ax.spines.values(): s.set_color('#3a3f47')
    if title: ax.set_title(title, fontsize=9.5, color=FG, loc='left')

def num(s):
    m = re.search(r'-?\d+(?:\.\d+)?', s or ''); return float(m.group()) if m else None

def range_of(want):
    m = re.match(r'\s*(-?[\d.]+)\s*±\s*([\d.]+)', want or '')
    if m: c, t = float(m.group(1)), float(m.group(2)); return c - t, c + t, c
    m = re.match(r'\s*(-?[\d.]+)\s*to\s*(-?[\d.]+)', want or '')
    if m: return float(m.group(1)), float(m.group(2)), None
    return None

def generic_chart(ax, checks, acc):
    # every check with a numeric range: where the measurement fell inside what was allowed (0 = bottom of the range, 1 = top)
    rows = []
    for k in checks:
        r = range_of(k['want']); g = num(k['got'])
        if not r or g is None or r[1] == r[0]: continue
        rows.append((k['name'], (g - r[0]) / (r[1] - r[0]), k['ok']))
    rows = rows[-12:]
    if not rows: ax.axis('off'); return False
    for i, (n, v, ok) in enumerate(rows):
        y = len(rows) - 1 - i; ax.plot([0, 1], [y, y], color='#3a3f47', lw=6, solid_capstyle='round'); ax.plot([min(max(v, -0.15), 1.15)], [y], 'o', color=acc if ok else '#ff4b3e', ms=7)
        ax.text(-0.2, y, textwrap.shorten(n, 46), ha='right', va='center', fontsize=7.6, color=FG)
    ax.set_xlim(-0.2, 1.2); ax.set_ylim(-0.8, len(rows) - 0.2); ax.set_yticks([]); ax.set_xticks([0, 0.5, 1]); ax.set_xticklabels(['allowed\nlow', 'middle', 'allowed\nhigh'], fontsize=7.5)
    style(ax, 'where each measurement fell in its allowed range'); ax.grid(False)
    return True

def sheet(eng, v, imgs, chart=None, name=None, title_extra='', can_extra=None, extra_imgs_cols=None):
    E = ENG[eng]; L = [x for x in E['levels'] if x['v'] == v][0]; R = L['res']; acc = ACC[eng]
    fig = plt.figure(figsize=(24, 13.5), dpi=100); fig.patch.set_facecolor(BG)
    # the header
    fig.add_artist(patches.Rectangle((0, 0.915), 1, 0.085, transform=fig.transFigure, color='#151820', zorder=-1))
    fig.text(0.015, 0.968, eng, fontsize=30, weight='bold', color=acc, va='center')
    fig.text(0.015 + 0.0105 * len(eng) + 0.025, 0.968, 'v' + str(v) + '  ·  ' + L['title'] + title_extra, fontsize=24, color=FG, va='center')
    fig.text(0.015, 0.932, L['focus'], fontsize=12.5, color=DIM, va='center')
    ok = R['ok']; fig.text(0.985, 0.968, ('PASSED ' if ok else 'FAILED ') + str(R['pass']) + ' / ' + str(R['n']) + ' checks', fontsize=18, weight='bold', color=acc if ok else '#ff4b3e', ha='right', va='center')
    fig.text(0.985, 0.932, E['title'] + ' · version ' + str(v) + ' of 5 · held only while versions 1 to ' + str(v) + ' all pass', fontsize=10.5, color=DIM, ha='right', va='center')
    # left: what it studied
    y = 0.895; x0 = 0.015
    fig.text(x0, y, 'WHAT IT STUDIED', fontsize=11, weight='bold', color=acc, va='top'); y -= 0.024
    for st in L['studied']:
        y = text_block(fig, x0, y, wrap(st['topic'], 52), size=11.5, weight='bold')
        for f in st['facts']:
            ls = wrap(f, 66); y = text_block(fig, x0 + 0.006, y, ['• ' + ls[0]] + ['  ' + l for l in ls[1:]], size=9.6)
        for s in st.get('src', [])[:3]:
            y = text_block(fig, x0 + 0.006, y, wrap('↳ ' + s[0], 74), size=8.2, color='#7d848d')
        y -= 0.008
    y -= 0.004
    fig.text(x0, y, 'WHAT IT CAN DO NOW', fontsize=11, weight='bold', color=acc, va='top'); y -= 0.024
    for c in L['can'] + (can_extra or []):
        ls = wrap(c, 66); y = text_block(fig, x0, y, ['✓ ' + ls[0]] + ['   ' + l for l in ls[1:]], size=9.6)
    # middle: the evidence pictures
    xm, wm = 0.285, 0.455; ytop = 0.9; avail = 0.885
    n = len(imgs)
    for i, (p, cap) in enumerate(imgs):
        per = (ytop - 0.02) / (n - i)
        ytop = img_axes(fig, p, (xm, ytop - per, wm, per), cap, acc) + 0.012
    # right: the exam
    xr = 0.755; y = 0.895
    fig.text(xr, y, 'THE EXAM (measured on its own output)', fontsize=11, weight='bold', color=acc, va='top'); y -= 0.024
    chk = R['checks']; size = 8.4 if len(chk) <= 14 else 7.6 if len(chk) <= 20 else 7.0
    for k in chk:
        mark = '✓' if k['ok'] else '✗'
        ls = wrap(k['name'], 60); got = textwrap.shorten(k['got'], 40); want = textwrap.shorten(k['want'], 34)
        y = text_block(fig, xr, y, [mark + ' ' + ls[0]] + ['   ' + l for l in ls[1:2]], size=size, color=FG if k['ok'] else '#ff4b3e', lh=1.32)
        y = text_block(fig, xr + 0.009, y, ['got ' + got + ('   ·   wanted ' + want if want else '')], size=size - 0.6, color='#8fd3a0' if k['ok'] else '#ff8a7a', family='DejaVu Sans Mono', lh=1.45)
    for nt in R.get('notes', [])[:2]: y = text_block(fig, xr, y - 0.004, wrap('note: ' + nt, 66), size=8, color=DIM)
    # the chart
    ch_top = min(y - 0.02, 0.5); ch_h = ch_top - 0.04
    if ch_h > 0.12:
        ax = fig.add_axes([xr + 0.03, 0.05, 0.2, ch_h - 0.03])
        if chart: chart(ax, R, acc)
        else: generic_chart(ax, chk, acc)
    path = OUT + '/' + (name or (eng.lower() + '_v' + str(v))) + '.png'
    fig.savefig(path, dpi=100); plt.close(fig); print('wrote', path); return path

# ---------- the charts ----------
def ch_curve(key, xs=None, xlabel='', ylabel='', title=None, marker='o', log=False):
    def f(ax, R, acc):
        ys = R['curves'][key]; x = xs or list(range(1, len(ys) + 1)); ax.plot(x[:len(ys)], ys, marker=marker, color=acc, lw=2, ms=5)
        if log: ax.set_yscale('log')
        ax.set_xlabel(xlabel, fontsize=8.5); ax.set_ylabel(ylabel, fontsize=8.5); style(ax, title or key)
    return f

def lg1(ax, R, acc):
    rows = [(k['name'].split(' / ')[0], num(k['got']), range_of(k['want'])) for k in R['checks'] if '/ stature' in k['name'] and range_of(k['want'])]
    for i, (n, g, r) in enumerate(rows):
        ax.barh(i, r[2], color='#3a3f47', height=0.6); ax.plot([g], [i], 'o', color=acc, ms=8); ax.plot([r[0], r[1]], [i, i], color='#666', lw=1)
    ax.set_yticks(range(len(rows))); ax.set_yticklabels([r[0] for r in rows], fontsize=8.5); ax.invert_yaxis(); style(ax, 'proportions: the body (dots) against the tables (bars)'); ax.set_xlabel('fraction of stature', fontsize=8.5)

def lg3(ax, R, acc):
    g = R['curves']['support-hand grip on the carbine: cost while learning']; ax.plot(range(1, len(g) + 1), g, 'o-', color=acc, lw=2)
    ax.set_yscale('log'); ax.set_xlabel('practice try', fontsize=8.5); ax.set_ylabel('grip cost (log)', fontsize=8.5)
    b = R['curves']['joints out of range: before and after']
    style(ax, 'learning the support-hand grip: cost per try\n(and joints out of range: ' + str(int(b[0])) + ' as made → ' + str(int(b[1])) + ' with anatomy)')

def lg4a(ax, R, acc):
    a = R['curves']['worst contact error per grasp before settling (mm)']; b = R['curves']['after settling (mm)']; x = range(1, len(a) + 1)
    ax.bar([i - 0.2 for i in x], a, 0.4, color='#5b616a', label='first fit'); ax.bar([i + 0.2 for i in x], b, 0.4, color=acc, label='settled')
    ax.set_xlabel('grasp', fontsize=8.5); ax.set_ylabel('worst contact error (mm)', fontsize=8.5); ax.legend(fontsize=8, facecolor='#151820', edgecolor='#333', labelcolor=FG); style(ax, 'the hand settling on each thing')

def lg4b(ax, R, acc):
    v = R['curves']['reach: hand speed (m/s)']; dur = 2.2625; t = [i / (len(v) - 1) * dur for i in range(len(v))]
    ax.plot(t, v, color=acc, lw=2)
    for tt, lab in [(0.15, 'start'), (0.491, 'peak'), (0.962, 'touch'), (1.162, 'lift')]: ax.axvline(tt, color='#777', ls='--', lw=0.8); ax.text(tt + 0.02, max(v) * 1.02, lab, fontsize=7.5, color=FG)
    ax.text(0.5, max(v) * 0.6, 'peak at 42% of\nstart-to-touch', fontsize=7.8, color=FG)
    ax2 = ax.inset_axes([0.6, 0.45, 0.38, 0.38]); m = R['curves']['throw: miss of each practice throw (m)']; ax2.plot(range(1, len(m) + 1), m, 'o-', color='#ffd23d', lw=1.5, ms=3); ax2.set_title('throw: miss per practice (m)', fontsize=7.5, color=FG); style(ax2); ax2.tick_params(labelsize=7)
    ax.set_xlabel('seconds (the reach, then the lift)', fontsize=8.5); ax.set_ylabel('hand speed (m/s)', fontsize=8.5); ax.set_ylim(0, max(v) * 1.12); style(ax, 'reach: the bell of speed, and the throw learning to land')

def lg5(ax, R, acc):
    c = R['curves']['clips with a limb into the body (over 2 cm, over 6 cm): before, after']
    ax.bar([0, 1], [c[0], c[2]], 0.38, color=['#5b616a', acc]); ax.bar([2.2, 3.2], [c[1], c[3]], 0.38, color=['#5b616a', acc])
    ax.set_xticks([0, 1, 2.2, 3.2]); ax.set_xticklabels(['> 2 cm\nbefore', '> 2 cm\nafter', '> 6 cm\nbefore', '> 6 cm\nafter'], fontsize=8); style(ax, 'clips with a limb into the body')

def mm4(ax, R, acc):
    cols = ['#9fd2ff', acc, '#ff8a5a', '#ffffff']
    for i, (k, vs) in enumerate(R['curves'].items()): ax.plot(range(1, len(vs) + 1), vs, 'o-', color=cols[i], lw=1.8, label=k.split(', ')[-1])
    ax.legend(fontsize=7.5, facecolor='#151820', edgecolor='#333', labelcolor=FG); ax.set_xlabel('metering pass', fontsize=8.5); ax.set_ylabel('ratio error', fontsize=8.5); style(ax, 'light metered by two renders, the fill corrected')

def mm5(ax, R, acc):
    a = R['curves']['rule-of-six parts, directed (emotion, story, rhythm, eye-trace, plane, space)']; b = R['curves']['the same, the careless edit']; lab = ['emotion', 'story', 'rhythm', 'eye-trace', 'plane', 'space']
    x = range(len(a)); ax.bar([i - 0.2 for i in x], a, 0.4, color=acc, label='directed'); ax.bar([i + 0.2 for i in x], b, 0.4, color='#5b616a', label='careless')
    ax.set_xticks(list(x)); ax.set_xticklabels(lab, fontsize=8, rotation=20); ax.legend(fontsize=8, facecolor='#151820', edgecolor='#333', labelcolor=FG); style(ax, "Murch's rule of six: the director's cut against a careless one")

def vx3(ax, R, acc):
    a = R['curves']['depth of field: blur measured on the render (px), points at 2, 3, 4, 6, 9 m']; b = R['curves']['blur the lens formula predicts (px)']; d = [2, 3, 4, 6, 9]
    ax.plot(d, b, 's--', color='#888', label='thin-lens formula'); ax.plot(d, a, 'o-', color=acc, lw=2, label='measured on the render'); ax.legend(fontsize=8, facecolor='#151820', edgecolor='#333', labelcolor=FG)
    ax.set_xlabel('distance (m), focus at 4 m', fontsize=8.5); ax.set_ylabel('blur diameter (px)', fontsize=8.5); style(ax, 'depth of field: the render against the lens')

def vx4(ax, R, acc):
    a = R['curves']['fog transmittance measured at 3, 6, 12 m']; b = R['curves']['exp(-rho L)']; d = [3, 6, 12]
    ax.plot(d, b, 's--', color='#888', label='Beer-Lambert exp(-ρL)'); ax.plot(d, a, 'o-', color=acc, lw=2, label='measured'); ax.legend(fontsize=8, facecolor='#151820', edgecolor='#333', labelcolor=FG); ax.set_xlabel('distance (m)', fontsize=8.5); ax.set_ylabel('light let through', fontsize=8.5); style(ax, 'fog: measured against the law')

def vx5(ax, R, acc):
    v = R['curves']["rain: a 2 mm drop's speed over its first second (m/s)"]; t = [i / 10 for i in range(len(v))]
    ax.plot(t, v, 'o-', color=acc, lw=2); ax.axhline(9.65 - 10.3 * 2.718281828 ** (-1.2), color='#888', ls='--', lw=1); ax.text(0.02, v[-1] * 1.02, 'terminal 6.55 m/s (Atlas et al.)', fontsize=8, color=FG)
    ax.set_xlabel('seconds', fontsize=8.5); ax.set_ylabel('m/s', fontsize=8.5); style(ax, "rain: a 2 mm drop's speed")

def ch1(ax, R, acc):
    for i, (mv, t) in enumerate(MOVES):
        ax.barh(i, t[0], color='#5b616a'); ax.barh(i, t[1], left=t[0], color=acc); ax.barh(i, t[2], left=t[0] + t[1], color='#3a4a5a')
    ax.set_yticks(range(len(MOVES))); ax.set_yticklabels([m[0] for m in MOVES], fontsize=8); ax.invert_yaxis(); ax.set_xlabel('seconds: wind-up (grey), contact (colour), recovery (blue)', fontsize=8); style(ax, 'each move timed')

def ch_gaps(ax, R, acc):
    g = R['curves']['gaps between blows (s)']; ax.bar(range(1, len(g) + 1), g, color=[acc if x < 0.6 else '#5b616a' for x in g]); ax.set_xlabel('gap after each blow', fontsize=8.5); ax.set_ylabel('seconds', fontsize=8.5); style(ax, 'pause, burst, pause: short gaps inside a phrase')

def ch5(ax, R, acc):
    v = R['curves']['intensity of each exchange']; ax.plot(range(1, len(v) + 1), v, 'o-', color=acc, lw=2); ax.fill_between(range(1, len(v) + 1), v, color=acc, alpha=0.15); ax.set_xlabel('exchange', fontsize=8.5); style(ax, 'the fight as a story: intensity rising to the end')

def brd5(ax, R, acc):
    an = BRD['anim']
    for i, s in enumerate(an):
        ax.barh(0, s['t1'] - s['t0'], left=s['t0'], color=acc if i % 2 else '#b8a77e', edgecolor=BG); ax.text((s['t0'] + s['t1']) / 2, 0, str(s['n']), ha='center', va='center', fontsize=7.5, color=BG)
    ed = BRD['take']['edl']
    for i, e in enumerate(ed):
        ax.barh(-1, e['out'] - e['in'], left=e['in'], color='#3de8ff' if i % 2 else '#2a9fb5', edgecolor=BG); ax.text((e['in'] + e['out']) / 2, -1, e['size'], ha='center', va='center', fontsize=6.8, color=BG)
    ax.set_yticks([0, -1]); ax.set_yticklabels(["BOARD's\nanimatic", "MIMATIC's\ncut"], fontsize=8); ax.set_xlabel('seconds', fontsize=8.5); style(ax, 'the animatic, and the cut the director made from it'); ax.set_ylim(-1.7, 0.7)

# ---------- extra pictures made here (tables, trajectories) ----------
def table_img(path, cols, rows, widths, title):
    h = 0.42 + 0.28 * len(rows); fig = plt.figure(figsize=(16, h), dpi=110); fig.patch.set_facecolor('#151820'); ax = fig.add_axes([0.01, 0.01, 0.98, 0.98]); ax.axis('off')
    x = 0; xs = []
    for w in widths: xs.append(x); x += w
    tot = x; ty = 1 - 0.28 / h
    for c, cx in zip(cols, xs): ax.text(cx / tot, ty, c, fontsize=10.5, weight='bold', color='#e9d9b0', transform=ax.transAxes, va='center')
    for r, row in enumerate(rows):
        yy = ty - (r + 1) * 0.28 / h
        if r % 2 == 0: ax.add_patch(patches.Rectangle((0, yy - 0.14 / h), 1, 0.28 / h, color='#1c2028', transform=ax.transAxes, zorder=-1))
        for v2, cx, w in zip(row, xs, widths): ax.text(cx / tot, yy, textwrap.shorten(str(v2), max(8, int(w * 1.6))), fontsize=9.5, color=FG, transform=ax.transAxes, va='center')
    fig.savefig(path, dpi=110); plt.close(fig)

def fx_img(path):
    fig = plt.figure(figsize=(16, 4.6), dpi=110); fig.patch.set_facecolor(BG)
    import matplotlib.cm as cm
    for i, (kd, title) in enumerate([('sparks', 'sparks: flung at 20-40 m/s, drag, cooling (colour = temperature)'), ('smoke', 'smoke: buoyant, carried by curl noise, spreading'), ('debris', 'debris: thrown off the normal, bouncing, settling'), ('dust', 'dust: a ring along the ground, slowing, settling')]):
        ax = fig.add_axes([0.035 + i * 0.245, 0.12, 0.21, 0.72]); tr = FX[kd]
        for p in tr:
            xs = [q[1] for q in p]; zs = [q[3] for q in p] if kd != 'dust' else [q[2] for q in p]
            if kd == 'sparks':
                for a in range(len(p) - 1): ax.plot(xs[a:a + 2], zs[a:a + 2], color=cm.inferno(min(1, max(0, (p[a][4] - 700) / 1500))), lw=1.2)
            elif kd == 'smoke': ax.plot(xs, zs, color='#9aa6b8', lw=0.8, alpha=0.8); ax.scatter(xs[::6], zs[::6], s=[max(2, (q[5] * 260) ** 2 / 4) for q in p[::6]], color='#9aa6b8', alpha=0.12)
            else: ax.plot(xs, zs, color=ACC['VFXRAY'] if kd == 'debris' else '#c9b48a', lw=0.9)
        style(ax); ax.set_title(title, fontsize=8.6, color=FG, loc='left'); ax.set_xlabel('x (m)', fontsize=8); ax.set_ylabel('height (m)' if kd != 'dust' else 'y (m, from above)', fontsize=8)
        if kd == 'dust': ax.set_aspect('equal', adjustable='datalim')
    fig.savefig(path, dpi=110); plt.close(fig)

def crop(src, dst, box):
    im = Image.open(src); w, h = im.size; im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).save(dst)

def build():
    e = EV
    beats = [[b['i'] + 1, b['who'], b['act'], b['whom'], b['what'], b['how'], (b['quote'] and '"' + b['quote'] + '"') or '', (str(round(b['t0'], 1)) + '-' + str(round(b['t1'], 1)) + ' s') if b['t0'] is not None else ''] for b in BRD['beats']]
    table_img(e + '/brd_beats.png', ['#', 'who', 'does', 'to whom', 'with', 'how', 'says', 'when'], beats, [3, 10, 8, 10, 7, 9, 12, 9], 'beats')
    shots = [[s['n'], s['size'], s['type'], s['move'], str(s['lens']) + ' mm', str(round(s['t1'] - s['t0'], 1)) + ' s' if s['t0'] is not None else '', s['desc']] for s in BRD['shots']]
    table_img(e + '/brd_shots.png', ['shot', 'size', 'type', 'move', 'lens', 'length', 'what we see'], shots, [4, 5, 6, 8, 6, 6, 40], 'shots')
    fx_img(e + '/fx_traj.png')
    crop(e + '/brd_board.png', e + '/brd_panels.png', (0, 0, 1, 0.66)); crop(e + '/brd_board.png', e + '/brd_plan.png', (0.15, 0.66, 0.85, 1))
    out = []
    out.append(sheet('LEGEND', 1, [(e + '/lg1_body.png', 'The Operator front, side and three-quarter: the joint centres it is posed by (blue) and the stature in eighths.'), (e + '/lg1_reach.png', 'Reaching: five targets round the shoulder (yellow), the hand sent to each by two-bone IK; the exam reaches 120 and misses by 0.000 mm.')], lg1))
    out.append(sheet('LEGEND', 2, [(e + '/lg2_fit.png', 'Fitted to the metal: the fingers as the clip posed them, and after the fit (each finger closes joint by joint until it touches that gun).'), (e + '/lg2_grips.png', 'Five guns: the firing hand high on the grip (top); the support hand\'s fingers round the handguard, or the pistol grip (bottom).')]))
    out.append(sheet('LEGEND', 3, [(e + '/lg3_rom.png', 'Anatomy: three poses from the game\'s own clips. As made, joints went past what a human joint can do (circled); with LEGEND\'s ranges the same poses are back inside them.'), (e + '/lg4_lift.png', 'Mass and balance: lifting a 12 kg crate with the legs (the centre of mass stays over the feet).')], lg3))
    out.append(sheet('LEGEND', 4, [(e + '/lg4_grasp1.png', 'Grasps chosen as people choose them (hook, large diameter, medium wrap, power sphere, tripod): first fit (top), settled (bottom).'), (e + '/lg4_grasp2.png', 'Precision and two-hand grasps (palmar pinch, lateral pinch, four-finger prismatic, small diameter, two hands): first fit and settled.')], lg4a, name='legend_v4a_grasps', title_extra=': grasps'))
    out.append(sheet('LEGEND', 4, [(e + '/lg4_reach.png', 'Reach to grasp: eyes first, a bell of speed, the hand opening widest at 70%, closing on the handle, lifting.'), (e + '/lg4_hand.png', 'Handing over: the receiver reaches, closes, and the weight passes in 0.3 s; someone holds the bottle at every moment.'), (e + '/lg4_throw.png', 'Throwing: leg up, stride, hips then trunk then elbow then arm (the kinetic chain); it learned when to let go, and the ball lands on 20 m.')], lg4b, name='legend_v4b_movement', title_extra=': movement'))
    out.append(sheet('LEGEND', 5, [(e + '/lg5_punch.png', 'One reach, performed as a punch (sudden, direct, strong): quick, a sharp peak.'), (e + '/lg5_float.png', 'The same reach as a float (sustained, indirect, light): slower, a wider arc, the same hand on the same handle.')], lg5))
    out.append(sheet('MIMATIC', 1, [(e + '/mm1_cine.png', 'The Operator\'s cinematic (1.9.992-994): shots, a time curve for the speed ramps and the freeze, cues for the score.')], ch_curve('speed of scene time (every 0.25 s)', xlabel='quarter seconds', ylabel='scene time speed', marker='')))
    out.append(sheet('MIMATIC', 2, [(e + '/mm2_line.png', 'The line-up of the five classes.'), (e + '/mm2_studio.png', 'The studio turntable.')], ch_curve('learned widening while the head is out of frame', xlabel='frame', ylabel='widening')))
    out.append(sheet('MIMATIC', 3, [(e + '/mm3_focal.png', 'Focal length from one place: 18, 35, 50, 85 mm on Super 35 (69 to 17 degrees across).'), (e + '/mm3_dolly.png', 'A dolly zoom: the face kept the same size from 24 mm at 1.1 m to 100 mm at 4.6 m; the street behind compresses.'), (D + '/dof_cmp.png', None)], ch_curve('depth of field at f/2.8 by focus distance (m), 50 mm', xs=[1, 2, 3, 5, 8, 12], xlabel='focus distance (m)', ylabel='depth of field (m)')))
    out.append(sheet('MIMATIC', 4, [(e + '/mm4_sizes.png', 'The shot sizes, ECU to EWS, each framed by the solver on the face as modelled (the eyes on the third line) with the size\'s own lens.'), (e + '/mm4_looks.png', 'Light designed for the subject: high key 2:1, standard 4:1, low key 8:1, noir 16:1, with their colour temperatures.')], mm4))
    out.append(sheet('MIMATIC', 5, [(e + '/film_alley.png', 'Directing a scene it was given as words: its coverage, cut by the rule of six (the master first, no crossings of the line, no jump cuts).')], mm5))
    out.append(sheet('VFXRAY', 1, [(e + '/vx1_rain.png', 'The finishing pass: rain in scene time with splashes, bloom, an anamorphic streak, grain and bars.')]))
    out.append(sheet('VFXRAY', 2, [(e + '/vx2_film.png', 'Film against video: halation round the lights, a soft shoulder in the highlights, a split tone and grain.')]))
    out.append(sheet('VFXRAY', 3, [(D + '/dof_cmp.png', 'Depth of field measured: glowing beads at 2, 3, 4, 6, 9 m, focus at 4 m, 85 mm f/1.4 (gathered in linear light).'), (e + '/vx3_mb.png', 'Motion blur from the shutter: the same camera pan without and with a 180 degree shutter.')], vx3))
    out.append(sheet('VFXRAY', 4, [(e + '/vx4_lut.png', 'Colour looks as 32-cube lookup tables: identity, teal-orange, bleach bypass, day for night, sodium.'), (e + '/vx4_fog.png', 'Atmosphere: height fog by the Beer-Lambert law (and light shafts from a lamp).')], vx4))
    out.append(sheet('VFXRAY', 5, [(e + '/fx_traj.png', 'The effects as small simulations (every path from the engine, seed 5).'), (e + '/film_gym.png', 'In a scene: cued by the fight (a ring of dust where the body lands, dust off the blows).')], vx5))
    out.append(sheet('CHOREO', 1, [(e + '/ch_moves.png', 'The vocabulary at the moment of contact, each with its timing (wind-up / contact / recovery, ms).')], ch1))
    out.append(sheet('CHOREO', 2, [(e + '/ch_gap.png', 'Stage combat: the blow stops a hand short along the lens. From its camera it lands; from above, the air between fist and face.')]))
    out.append(sheet('CHOREO', 3, [(e + '/ch_fight.png', 'A phrase: jab (blocked), cross, hook (ducked), body shot, front kick, with the pause-burst-pause rhythm.')], ch_gaps))
    out.append(sheet('CHOREO', 4, [(e + '/film_gym.png', 'Fights for the camera: MIMATIC shoots CHOREO\'s fight; every hit reads from where the camera stands.')]))
    out.append(sheet('CHOREO', 5, [(e + '/ch_alley.png', 'A whole fight: three people, six phrases, a bottle picked up off a crate and used, one attacker at a time, a shot to end it.')], ch5))
    out.append(sheet('BOARD', 1, [(e + '/brd_beats.png', 'The scene read: who does what, to whom, with what, how, what they say, and when (as staged).')]))
    out.append(sheet('BOARD', 2, [(e + '/brd_shots.png', 'The shot list, every beat planned as shots with the fields a production works from.')]))
    out.append(sheet('BOARD', 3, [(e + '/brd_panels.png', 'The board: each panel drawn from MIMATIC\'s camera with the people as LEGEND performs them, arrows for movement and camera.')]))
    out.append(sheet('BOARD', 4, [(e + '/brd_plan.png', 'The floor plan: the marks, the paths, the line of action, every camera and its field of view.')]))
    out.append(sheet('BOARD', 5, [(e + '/brd_rev.png', 'Notes taken: a size changed, an insert added (the rest renumbered and retimed), the coverage flipped across the line with continuity kept.')], brd5))
    return out

if __name__ == '__main__':
    build()
