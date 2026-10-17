"""Replace the icon inside a Windows .exe (PE32+) in place: every RT_ICON image is rewritten as a PNG of our icon at
the same size, as long as it fits in the space the old image took (PNG icons are far smaller than the old bitmaps).
Usage: peicon.py <exe> <icon.png> [--list]"""
import struct, sys, io
from PIL import Image

def parse(d):
    pe = struct.unpack_from('<I', d, 0x3c)[0]; assert d[pe:pe+4] == b'PE\0\0'
    nsec = struct.unpack_from('<H', d, pe+6)[0]; optsz = struct.unpack_from('<H', d, pe+20)[0]
    opt = pe + 24; magic = struct.unpack_from('<H', d, opt)[0]
    dd = opt + (112 if magic == 0x20b else 96)
    rva_rsrc, sz_rsrc = struct.unpack_from('<II', d, dd + 16)
    secs = []
    so = opt + optsz
    for i in range(nsec):
        name = d[so+40*i:so+40*i+8].rstrip(b'\0').decode()
        vsz, va, rsz, rptr = struct.unpack_from('<IIII', d, so+40*i+8)
        secs.append((name, va, max(vsz, rsz), rptr, rsz))
    def off(rva):
        for n, va, sz, rp, rs in secs:
            if va <= rva < va + sz: return rva - va + rp
        raise ValueError(hex(rva))
    base = off(rva_rsrc)
    def walk(o):
        named, ids = struct.unpack_from('<HH', d, base + o + 12)
        out = []
        for i in range(named + ids):
            nid, od = struct.unpack_from('<II', d, base + o + 16 + 8*i)
            out.append((nid, od))
        return out
    res = {}
    for tid, od in walk(0):
        if not (od & 0x80000000) or tid & 0x80000000: continue
        for nid, od2 in walk(od & 0x7fffffff):
            for lid, od3 in walk(od2 & 0x7fffffff) if od2 & 0x80000000 else [(0, od2)]:
                de = base + od3
                rva, size = struct.unpack_from('<II', d, de)
                res.setdefault(tid, []).append({'id': nid, 'lang': lid, 'de': de, 'off': off(rva), 'size': size})
    return res

def main():
    exe, png = sys.argv[1], sys.argv[2]
    d = bytearray(open(exe, 'rb').read())
    res = parse(d)
    icons = {e['id']: e for e in res.get(3, [])}
    groups = res.get(14, [])
    src = Image.open(png).convert('RGBA')
    if '--list' in sys.argv:
        for g in groups:
            cnt = struct.unpack_from('<H', d, g['off'] + 4)[0]
            for i in range(cnt):
                w, h, cc, r, planes, bc, nbytes, nid = struct.unpack_from('<BBBBHHIH', d, g['off'] + 6 + 14*i)
                print('group', g['id'], 'size', w or 256, 'bits', bc, 'bytes', nbytes, 'icon id', nid, 'slot', icons[nid]['size'])
        return
    # the icon images usually sit one after another; if so, pack the new ones into that whole run so the large
    # icon can use the space the small ones no longer need
    ents = []
    for g in groups:
        cnt = struct.unpack_from('<H', d, g['off'] + 4)[0]
        for i in range(cnt):
            eo = g['off'] + 6 + 14*i
            w, h, cc, r, planes, bc, nbytes, nid = struct.unpack_from('<BBBBHHIH', d, eo)
            ents.append({'eo': eo, 'S': w or 256, 'nid': nid, 'e': icons[nid]})
    ents.sort(key=lambda x: x['e']['off'])
    run = all(ents[i]['e']['off'] + ents[i]['e']['size'] <= ents[i+1]['e']['off'] <= ents[i]['e']['off'] + ents[i]['e']['size'] + 8 for i in range(len(ents) - 1))
    def enc(S, q):
        img = src.resize((S, S), Image.LANCZOS)
        if q: img = img.quantize(colors=255, method=Image.FASTOCTREE).convert('RGBA')
        b = io.BytesIO(); img.save(b, 'PNG', optimize=True); return b.getvalue()
    done = 0
    if run and ents:
        lo = ents[0]['e']['off']; hi = ents[-1]['e']['off'] + ents[-1]['e']['size']
        datas = [enc(x['S'], False) for x in ents]
        for k in range(len(ents) - 1, -1, -1):        # quantize the biggest images first until everything fits
            if sum((len(t) + 3) & ~3 for t in datas) <= hi - lo: break
            datas[k] = enc(ents[k]['S'], True)
        if sum((len(t) + 3) & ~3 for t in datas) <= hi - lo:
            pos = lo; d[lo:hi] = b'\0' * (hi - lo)
            for x, data in zip(ents, datas):
                d[pos:pos + len(data)] = data
                rva0 = struct.unpack_from('<I', d, x['e']['de'])[0] - x['e']['off']   # rva minus file offset is constant in a section
                struct.pack_into('<II', d, x['e']['de'], rva0 + pos, len(data))
                struct.pack_into('<BBBBHHIH', d, x['eo'], x['S'] % 256, x['S'] % 256, 0, 0, 1, 32, len(data), x['nid'])
                pos += (len(data) + 3) & ~3; done += 1
            print('packed', done, 'icons into', hi - lo, 'bytes:', [len(t) for t in datas])
    if not done:
        for x in ents:
            e = x['e']; data = enc(x['S'], False)
            if len(data) > e['size']: data = enc(x['S'], True)
            if len(data) > e['size']: print('skip', x['S'], len(data), '>', e['size']); continue
            d[e['off']:e['off'] + e['size']] = data + b'\0' * (e['size'] - len(data))
            struct.pack_into('<I', d, e['de'] + 4, len(data))
            struct.pack_into('<BBBBHHIH', d, x['eo'], x['S'] % 256, x['S'] % 256, 0, 0, 1, 32, len(data), x['nid'])
            done += 1
    print('replaced', done, 'icon images')
    open(exe, 'wb').write(d)

main()
