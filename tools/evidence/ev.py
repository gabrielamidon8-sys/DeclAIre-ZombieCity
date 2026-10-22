import sys, json, asyncio
from playwright.async_api import async_playwright
import os; D = os.path.dirname(os.path.abspath(__file__))
async def main():
    shots = json.load(open(sys.argv[1])) if sys.argv[1].endswith('.json') else json.loads(sys.argv[1])
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={"width":1200,"height":900}); errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('file://'+D+'/dev.html')
        res = {}
        for s in shots:
            name = s.pop('name'); fn = s.pop('fn')
            try:
                r = await pg.evaluate(f"async () => await window.{fn}({json.dumps(s)})")
                du = await pg.evaluate("() => document.getElementById('c2').toDataURL('image/png')")
                import base64; open(D+'/ev/'+name+'.png','wb').write(base64.b64decode(du.split(',')[1]))
                res[name] = r; print(name, json.dumps(r)[:300], flush=True)
            except Exception as e:
                print('FAIL', name, str(e)[:400], flush=True)
        json.dump(res, open(D+'/ev/_res_'+(sys.argv[2] if len(sys.argv)>2 else 'x')+'.json','w'))
        print('ERRS', errs[:8]); await b.close()
asyncio.run(main())
