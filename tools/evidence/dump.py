import json, asyncio, sys, time
from playwright.async_api import async_playwright
import os; D = os.path.dirname(os.path.abspath(__file__))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={"width":960,"height":900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('file://'+D+'/dev.html')
        t=time.time()
        r = await pg.evaluate("""async () => { await lgAtlasGet(128); const t0=performance.now(); const out = {}; for (const n of CUR.order) { const t1=performance.now(); curRun(n); out[n]=Math.round(performance.now()-t1); }
          const eng = CUR.order.map(n => { const c = CUR.eng[n]; return { name: n, title: c.title, role: c.role, intro: c.intro, earned: c.earned,
            levels: c.levels.map(L => ({ v: L.v, title: L.title, focus: L.focus, studied: L.studied, can: L.can, res: c.res[L.v] && { ok: c.res[L.v].ok, n: c.res[L.v].n, pass: c.res[L.v].pass, ms: c.res[L.v].ms, checks: c.res[L.v].checks, curves: c.res[L.v].curves, notes: c.res[L.v].notes, evKeys: Object.keys(c.res[L.v].ev||{}) } })) }; });
          return { times: out, total: Math.round(performance.now()-t0), eng: eng }; }""")
        json.dump(r, open(D+'/course.json','w'), indent=1)
        print('times', r['times'], r['total'], 'wall', round(time.time()-t))
        for e in r['eng']:
            print(e['name'], 'v', e['earned'], [(L['v'], L['res']['pass'], L['res']['n'], L['res']['ms']) for L in e['levels']])
        print('ERRS', errs[:5]); await b.close()
asyncio.run(main())
