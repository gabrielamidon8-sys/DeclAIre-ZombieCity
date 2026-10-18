#!/usr/bin/env python3
"""Builds filterdata.js, the word data the name filter (filter.js) checks names against.

Source: the English list from "List of Dirty, Naughty, Obscene, and Otherwise Bad Words"
(https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words), licensed CC BY 4.0,
plus a few phrases about self-harm and threats. The words are stored ROT13 + base64 so the game's source isn't
a readable list of slurs. Nothing here prints the words.

Each entry gets one of two match modes, worked out against the hunspell English dictionary so innocent words
don't get flagged:
  SUB  - caught anywhere inside a name, even glued to other letters. Innocent dictionary words that contain the
         entry (COCKPIT, CLASSIC, SCUNTHORPE...) go on a mask list and are blanked out before the check.
  WORD - caught only as a whole word (short entries, and entries that hide inside too many ordinary words).

usage: python3 tools/make_filter_data.py <path to the list's "en" file> [hunspell .dic] > filterdata.js
"""
import base64, codecs, json, re, sys, unicodedata

EXTRA = ['kys', 'kill yourself', 'kill urself', 'kill your self', 'go die', 'unalive yourself']
# innocent names and words the dictionary doesn't have (places, surnames, food) that contain a listed word
MANUAL_MASK = ['scunthorpe', 'penistone', 'cockermouth', 'clitheroe', 'middlesex', 'wessex', 'sussex', 'essex', 'matsushita',
               'cockburn', 'babcock', 'hitchcock', 'hancock', 'woodcock', 'dickens', 'dickinson', 'dickson', 'sexton', 'shitake',
               'shiitake', 'cumberland', 'cumbria', 'kumquat', 'lightwater', 'arsenal', 'assassin', 'therapist', 'analyst',
               'cocktail', 'cockpit', 'peacock', 'titanic', 'titanium', 'sextant', 'sextet', 'butterscotch', 'buttercup',
               'hellfire', 'shellshock', 'pistachio', 'documentary', 'circumstance', 'cucumber', 'scrape', 'grape', 'drape',
               'specialist', 'nazareth', 'japanese', 'manuscript', 'spicy', 'raccoon', 'tycoon', 'cocoon', 'snigger', 'bigger',
               'trigger', 'niger', 'nigeria', 'retardant', 'homosapiens', 'hoboken']
SUFFIXES = ('', 's', 'es', 'er', 'ers', 'ed', 'ing', 'y', 'ies', 'head', 'heads', 'face', 'hole', 'holes', 'bag', 'wad', 'tard', 'off')


def squash(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return ''.join(c for c in s if 'a' <= c <= 'z')


def collapse(s):
    return re.sub(r'(.)\1+', r'\1', s)


def main():
    src = [a for a in sys.argv[1:] if not a.startswith('--')][0]
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dic = args[1] if len(args) > 1 else '/usr/share/hunspell/en_US.dic'
    raw = [l.strip() for l in open(src, encoding='utf-8') if l.strip()] + EXTRA
    entries = sorted({squash(w) for w in raw if len(squash(w)) >= 3})
    bad = set(entries)
    words = set()
    for line in open(dic, encoding='utf-8', errors='ignore').read().splitlines()[1:]:
        w = squash(line.split('/')[0])
        if len(w) >= 3:
            words.add(w)
            words.add(w + 's')

    def derived(w, e):
        # the entry itself with an ending, or a word that is itself on the list
        if w in bad:
            return True
        return any(w == e + suf for suf in SUFFIXES)

    sub, word, mask = [], [], set()
    for e in entries:
        if len(e) <= 3:
            word.append(e)
            continue
        hits = [w for w in words | set(MANUAL_MASK) if e in w and not derived(w, e)]
        if len(hits) <= 40 and (len(e) >= 5 or not hits):
            sub.append(e)
            mask.update(hits)
        else:
            word.append(e)
    # a masked word must not itself hide a different entry that has no business being masked
    mask = sorted(m for m in mask if m not in bad)

    if '--page' in sys.argv:
        # For the account page: it fetches the same list from jsDelivr and needs only each entry's mode, in sorted
        # order. 1 = anywhere in a name (no innocent word holds it, or only the hand-picked ones the page has),
        # 2 = whole word only. A checksum makes sure the page is reading the same list.
        manual = set(MANUAL_MASK)
        modes = ''
        for e in entries:
            if e in sub:
                hits = [w for w in words if e in w and not derived(w, e)]
                modes += '1' if all(h in manual for h in hits) else '2'
            else:
                modes += '2'
        h = 2166136261
        for ch in '\n'.join(entries):
            h = ((h ^ ord(ch)) * 16777619) & 0xffffffff
        # the extra entries and the mask go in packed (rot13 + base64, as in filterdata.js) so the page's source
        # doesn't spell them out; filter.js's ZCF.unpack reads them back
        sq = lambda e: re.sub('[^a-z]', '', unicodedata.normalize('NFKD', e).lower())
        packed = lambda lst: base64.b64encode(codecs.encode(' '.join(lst), 'rot13').encode()).decode()
        print(json.dumps({'count': len(entries), 'fnv': h, 'modes': modes, 'extra': packed([sq(e) for e in EXTRA if sq(e)]), 'mask': packed(MANUAL_MASK)}))
        return

    def pack(lst):
        return base64.b64encode(codecs.encode(' '.join(lst), 'rot13').encode()).decode()

    print('/* Generated by tools/make_filter_data.py from the English "List of Dirty, Naughty, Obscene, and Otherwise Bad Words"')
    print('   (https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, CC BY 4.0), checked against the')
    print('   hunspell English dictionary. ROT13 + base64 so the source is not a readable word list. Do not edit by hand. */')
    print('const ZCF_DATA = ' + json.dumps({'sub': pack(sub), 'word': pack(word), 'mask': pack(mask)}) + ';')
    sys.stderr.write('entries %d: sub %d, word %d, mask %d\n' % (len(entries), len(sub), len(word), len(mask)))


if __name__ == '__main__':
    main()
