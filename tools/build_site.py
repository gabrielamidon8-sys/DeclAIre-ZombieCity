#!/usr/bin/env python3
"""Puts the account page together in site/dist: the page, its script, and the same filter and account code the
game uses. filterpage.js holds only each word-list entry's match mode and a checksum; the page loads the public list.
usage: python3 tools/build_site.py <path to the list's "en" file>"""
import os, shutil, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(root, 'site', 'dist')
os.makedirs(dist, exist_ok=True)
for f in ('index.html', 'page.js'):
    shutil.copyfile(os.path.join(root, 'site', f), os.path.join(dist, f))
for f in ('filter.js', 'acct-core.js'):
    shutil.copyfile(os.path.join(root, f), os.path.join(dist, f))
data = subprocess.check_output([sys.executable, os.path.join(root, 'tools', 'make_filter_data.py'), sys.argv[1], '--page'], stderr=subprocess.DEVNULL).decode().strip()
open(os.path.join(dist, 'filterpage.js'), 'w').write('/* Match modes for the name filter (see tools/make_filter_data.py). Generated; do not edit. */\nwindow.ZCF_PAGE = ' + data + ';\n')
print('site built in', dist, sorted(os.listdir(dist)))
