"""Packages Zombie City as a portable Windows app: Electron (Windows x64) with the game inside it.
Usage: python3 desktop/build_win.py <electron-vX-win32-x64.zip> <out.zip> <version>
Run `node build.js win` first (it writes desktop/app/index.html). The result is a zip with one folder,
"Zombie City", holding ZombieCity.exe; unzip it anywhere and run the exe. Nothing is installed."""
import json, os, shutil, subprocess, sys, tempfile, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def main():
    ezip, out, ver = sys.argv[1], sys.argv[2], sys.argv[3]
    page = os.path.join(HERE, 'app', 'index.html')
    if not os.path.exists(page): sys.exit('run `node build.js win` first')
    tmp = tempfile.mkdtemp(prefix='zcwin-')
    top = os.path.join(tmp, 'Zombie City')
    with zipfile.ZipFile(ezip) as z: z.extractall(top)
    # the app's own name and icon
    os.rename(os.path.join(top, 'electron.exe'), os.path.join(top, 'ZombieCity.exe'))
    subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'peicon.py'), os.path.join(top, 'ZombieCity.exe'), os.path.join(HERE, 'icon.png')])
    # Electron's demo app is not needed; only the English language pack is kept (Chromium falls back to it)
    os.remove(os.path.join(top, 'resources', 'default_app.asar'))
    loc = os.path.join(top, 'locales')
    for f in os.listdir(loc):
        if f != 'en-US.pak': os.remove(os.path.join(loc, f))
    app = os.path.join(top, 'resources', 'app')
    os.makedirs(os.path.join(app, 'fonts'))
    shutil.copy(page, os.path.join(app, 'index.html'))
    for f in os.listdir(os.path.join(HERE, 'app', 'fonts')): shutil.copy(os.path.join(HERE, 'app', 'fonts', f), os.path.join(app, 'fonts', f))
    shutil.copy(os.path.join(HERE, 'main.js'), app); shutil.copy(os.path.join(HERE, 'preload.js'), app)
    shutil.copy(os.path.join(HERE, 'icon.png'), os.path.join(app, 'icon.png'))
    json.dump({ 'name': 'zombie-city', 'productName': 'Zombie City', 'version': ver if ver.count('.') == 2 else ver + '.0', 'main': 'main.js',
                'description': 'Zombie City: an endless zombie survival game.' }, open(os.path.join(app, 'package.json'), 'w'), indent=2)
    shutil.copy(os.path.join(HERE, 'README.txt'), os.path.join(top, 'README.txt'))
    if os.path.exists(out): os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for d, _, files in os.walk(top):
            for f in files:
                full = os.path.join(d, f)
                z.write(full, os.path.relpath(full, tmp))
    shutil.rmtree(tmp)
    print('built', out, round(os.path.getsize(out) / 1048576, 1), 'MB')

main()
