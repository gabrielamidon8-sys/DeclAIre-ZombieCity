"""Builds ZombieCity-Setup.exe, the Windows installer, from the launcher zip that build_win.py makes.
Usage: python3 desktop/build_setup.py <ZombieCity-Launcher-Windows.zip> <out-dir> <version>
Needs NSIS 3: set ZC_NSIS to its folder (the one with Stubs/, Plugins/, Contrib/ and makensis or linux/makensis).
The installer script and its pictures are in desktop/installer/ (tools/make_installer_art.py draws the pictures)."""
import os, shutil, subprocess, sys, tempfile, zipfile
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    zpath, outdir, ver = sys.argv[1], os.path.abspath(sys.argv[2]), sys.argv[3]
    nsis = os.environ.get('ZC_NSIS')
    if not nsis: sys.exit('set ZC_NSIS to the NSIS folder')
    mk = next((p for p in (os.path.join(nsis, 'linux', 'makensis'), os.path.join(nsis, 'makensis'), shutil.which('makensis') or '') if p and os.path.exists(p)), None)
    if not mk: sys.exit('makensis not found in ' + nsis)
    tmp = tempfile.mkdtemp(prefix='zcsetup-')
    with zipfile.ZipFile(zpath) as z: z.extractall(tmp)
    src = os.path.join(tmp, 'Zombie City')
    if not os.path.exists(os.path.join(src, 'Zombie City Launcher.exe')): sys.exit('the zip has no "Zombie City/Zombie City Launcher.exe"')
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, 'ZombieCity-Setup.exe')
    env = dict(os.environ, NSISDIR=nsis)
    r = subprocess.run([mk, '-V2', '-DVERSION=' + ver, '-DSRC=' + src, '-DOUT=' + out, 'installer.nsi'], cwd=os.path.join(HERE, 'installer'), env=env, capture_output=True, text=True)
    shutil.rmtree(tmp, ignore_errors=True)
    if r.returncode: sys.exit('makensis failed:\n' + r.stdout[-3000:] + r.stderr[-2000:])
    print('built', out, '%.1f MB' % (os.path.getsize(out) / 1048576))

if __name__ == '__main__':
    main()
