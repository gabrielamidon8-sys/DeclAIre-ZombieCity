"""Moves a build through the release phases. Every update goes dev -> test -> publish:

  dev      Build and run the automated tests (node build.js / app / win, then the co-op, account and launcher tests).
  test     python3 tools/release.py test
           The new web version goes to test/ (gabrielamidon8-sys.github.io/DeclAIre-ZombieCity/test/) while the main
           page keeps the published version. Commit and push. On GitHub, make a release for the version and tick
           "Set as a pre-release": the launcher's test channel (admin only) and the Android APK link in the release get it,
           everyone else does not. Set GameStatus.test to the version on Wix. The game shows "Test build" while it is
           being tested. Play it; anything wrong is fixed and tested again before it goes further.
  publish  Turn maintenance on (GameStatus.maintenance = true, with a message and an "until" time): players see
           "Down for maintenance" (a run in progress finishes first).
           python3 tools/release.py publish
           The tested web version replaces the main page. Commit and push. On GitHub, untick "pre-release" and tick
           "Set as the latest release", so the launcher and the website's download buttons get it. Set GameStatus.stable
           to the version (and minVer to it too if older versions can't play with it, like a co-op change).
           Turn maintenance off.

GameStatus is the one-row collection on the DeclAIre Studios Wix project (Wix dashboard > CMS > Game Status).
"""
import os, shutil, subprocess, sys, re
Z = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ver():
    return re.search(r"const ZC_VERSION = '([^']+)'", open(os.path.join(Z, 'game.js')).read()).group(1)

def stage_test():
    built = os.path.join(Z, 'zombie-city.html')
    if not os.path.exists(built): sys.exit('build first: node build.js')
    os.makedirs(os.path.join(Z, 'test'), exist_ok=True)
    shutil.copy(built, os.path.join(Z, 'test', 'zombie-city.html'))
    shutil.copy(os.path.join(Z, 'index.html'), os.path.join(Z, 'test', 'index.html'))
    # the main page goes back to the published version until this one has been tested
    tags = subprocess.run(['git', 'tag', '--list', 'v*', '--sort=-v:refname'], cwd=Z, capture_output=True, text=True).stdout.split()
    published = next((t for t in tags if t != 'v' + ver()), None)
    if published:
        for f in ('zombie-city.html', 'zombie-city-offline.html'):
            r = subprocess.run(['git', 'show', published + ':' + f], cwd=Z, capture_output=True)
            if r.returncode == 0: open(os.path.join(Z, f), 'wb').write(r.stdout)
    print('test: %s is in test/, the main page stays at %s' % (ver(), published or 'the current build'))

def publish():
    t = os.path.join(Z, 'test', 'zombie-city.html')
    if not os.path.exists(t): sys.exit('nothing in test/ to publish')
    subprocess.check_call(['node', 'build.js'], cwd=Z)   # the main page and the offline copy, from the same source
    print('publish: %s is the main page now (test/ keeps a copy until the next test)' % ver())

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'test': stage_test()
    elif cmd == 'publish': publish()
    else: print(__doc__)
