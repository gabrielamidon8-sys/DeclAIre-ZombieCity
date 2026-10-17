"""Packages the Zombie City Launcher for Windows: Electron (Windows x64) with the launcher, the Wi-Fi co-op server and a
copy of the game inside it. Usage: python3 desktop/build_win.py <electron-vX-win32-x64.zip> <out-dir> <version>
Run `node build.js win` first (it writes desktop/app/). Writes two things into <out-dir>:
  ZombieCity-Launcher-Windows.zip   one folder, "Zombie City", with "Zombie City Launcher.exe"; unzip and run, nothing installs
  zombie-city-game.html + game.json the game update the launcher downloads (attach both to the GitHub release)"""
import json, os, shutil, subprocess, sys, tempfile, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, 'app')
EXE = 'Zombie City Launcher.exe'

def main():
    ezip, outdir, ver = sys.argv[1], sys.argv[2], sys.argv[3]
    for f in ('game/index.html', 'game/game.json', 'launcher.html'):
        if not os.path.exists(os.path.join(APP, f)): sys.exit('run `node build.js win` first (missing ' + f + ')')
    os.makedirs(outdir, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='zcwin-')
    top = os.path.join(tmp, 'Zombie City')
    with zipfile.ZipFile(ezip) as z: z.extractall(top)
    # the app's own name and icon
    os.rename(os.path.join(top, 'electron.exe'), os.path.join(top, EXE))
    subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'peicon.py'), os.path.join(top, EXE), os.path.join(HERE, 'icon.png')])
    # Electron's demo app is not needed; only the English language pack is kept (Chromium falls back to it)
    os.remove(os.path.join(top, 'resources', 'default_app.asar'))
    loc = os.path.join(top, 'locales')
    for f in os.listdir(loc):
        if f != 'en-US.pak': os.remove(os.path.join(loc, f))
    app = os.path.join(top, 'resources', 'app')
    shutil.copytree(os.path.join(APP, 'game'), os.path.join(app, 'game'))
    shutil.copytree(os.path.join(APP, 'fonts'), os.path.join(app, 'fonts'))
    shutil.copy(os.path.join(APP, 'launcher.html'), app)
    for f in ('main.js', 'preload.js', 'lan.js'): shutil.copy(os.path.join(HERE, f), app)
    shutil.copy(os.path.join(HERE, 'icon.png'), os.path.join(app, 'icon.png'))
    json.dump({ 'name': 'zombie-city-launcher', 'productName': 'Zombie City', 'version': ver if ver.count('.') == 2 else ver + '.0', 'main': 'main.js',
                'description': 'Zombie City launcher: plays, updates and hosts Wi-Fi co-op.' }, open(os.path.join(app, 'package.json'), 'w'), indent=2)
    shutil.copy(os.path.join(HERE, 'README.txt'), os.path.join(top, 'README.txt'))
    out = os.path.join(outdir, 'ZombieCity-Launcher-Windows.zip')
    if os.path.exists(out): os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for d, _, files in os.walk(top):
            for f in files:
                full = os.path.join(d, f)
                z.write(full, os.path.relpath(full, tmp))
    shutil.rmtree(tmp)
    # the update files the launcher looks for on the latest GitHub release
    shutil.copy(os.path.join(APP, 'game', 'index.html'), os.path.join(outdir, 'zombie-city-game.html'))
    shutil.copy(os.path.join(APP, 'game', 'game.json'), os.path.join(outdir, 'game.json'))
    print('built', out, round(os.path.getsize(out) / 1048576, 1), 'MB, plus zombie-city-game.html and game.json')

main()
