#!/usr/bin/env python3
"""Builds Zombie City for Android: aapt2 (resources + manifest) -> dx (code) -> aligned zip -> APK Signature Scheme v2.
Usage: python3 build_apk.py   (expects www/ from `node build.js app` and build/classes.dex)"""
import hashlib, os, shutil, struct, subprocess, sys, zipfile, io, datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import pkcs12

HERE = os.path.dirname(os.path.abspath(__file__))
TC = os.environ.get('ZC_TC', '/home/claude/tc')   # folder holding aapt2 and android.jar
AAPT2, ANDROID_JAR = TC + '/aapt2', TC + '/ap/android-34/android.jar'
B = HERE + '/build'
# The signing key never goes in the repo. Point ZC_KEY at it and put its password in ZC_KEY_PASS.
KEY_P12 = os.environ.get('ZC_KEY', HERE + '/keys/zombie-city-signing-key.p12')
KEY_PASS = os.environ.get('ZC_KEY_PASS', '').encode()

def run(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a) + '\n' + r.stdout + r.stderr)
    return r.stdout

def key_and_cert():
    if not KEY_PASS: sys.exit('Set ZC_KEY_PASS to the signing key password.')
    if os.path.exists(KEY_P12):
        k, c, _ = pkcs12.load_key_and_certificates(open(KEY_P12, 'rb').read(), KEY_PASS)
        return k, c
    os.makedirs(os.path.dirname(KEY_P12), exist_ok=True)
    k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Zombie City'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Zombie City')])
    now = datetime.datetime(2026, 10, 1, tzinfo=datetime.timezone.utc)
    c = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(k.public_key())
         .serial_number(x509.random_serial_number()).not_valid_before(now).not_valid_after(now + datetime.timedelta(days=365 * 40))
         .sign(k, hashes.SHA256()))
    open(KEY_P12, 'wb').write(pkcs12.serialize_key_and_certificates(b'zombie-city', k, c, None, serialization.BestAvailableEncryption(KEY_PASS)))
    return k, c

def aligned_zip(entries):
    """entries: list of (name, data, compress). STORED entries start on 4-byte boundaries (zipalign rules)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, data, comp in entries:
            zi = zipfile.ZipInfo(name, date_time=(2026, 10, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED if comp else zipfile.ZIP_STORED
            zi.create_system = 0; zi.external_attr = 0
            if not comp:
                off = buf.tell(); hdr = 30 + len(name.encode()) + 6
                pad = (-(off + hdr)) % 4
                zi.extra = struct.pack('<HHH', 0xD935, 2 + pad, 4) + b'\0' * pad
            z.writestr(zi, data, compresslevel=9 if comp else None)
    return buf.getvalue()

def lp(b): return struct.pack('<I', len(b)) + b
def chunk_digest(sections):
    chunks = []
    for s in sections:
        for i in range(0, len(s), 1 << 20):
            c = s[i:i + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()

def sign_v2(apk, key, cert):
    eocd = apk.rfind(b'PK\x05\x06'); assert eocd > 0 and len(apk) - eocd == 22, 'unexpected zip comment'
    cd_size, cd_off = struct.unpack('<II', apk[eocd + 12:eocd + 20])
    assert cd_off + cd_size == eocd
    s1, s3, s4 = apk[:cd_off], apk[cd_off:eocd], apk[eocd:]
    ALG = 0x0103  # RSASSA-PKCS1-v1_5 with SHA2-256
    digest = chunk_digest([s1, s3, s4])
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    signed = lp(lp(struct.pack('<I', ALG) + lp(digest))) + lp(lp(cert_der)) + lp(b'')
    sig = key.sign(signed, padding.PKCS1v15(), hashes.SHA256())
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed) + lp(lp(struct.pack('<I', ALG) + lp(sig))) + lp(pub)
    value = lp(lp(signer))
    pair = struct.pack('<Q', 4 + len(value)) + struct.pack('<I', 0x7109871A) + value
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + b'APK Sig Block 42'
    s4 = s4[:16] + struct.pack('<I', cd_off + len(block)) + s4[20:]
    return s1 + block + s3 + s4

def main():
    os.makedirs(B, exist_ok=True)
    assets = B + '/assets'
    shutil.rmtree(assets, ignore_errors=True); shutil.copytree(HERE + '/www', assets + '/www')
    run(AAPT2, 'compile', '--dir', HERE + '/res', '-o', B + '/res.zip')
    run(AAPT2, 'link', '-o', B + '/base.apk', '-I', ANDROID_JAR, '--manifest', HERE + '/AndroidManifest.xml', '-A', assets, B + '/res.zip')
    entries = []
    with zipfile.ZipFile(B + '/base.apk') as z:
        for i in z.infolist():
            data = z.read(i.filename)
            stored = i.compress_type == zipfile.ZIP_STORED or i.filename == 'resources.arsc' or i.filename.endswith('.png')
            entries.append((i.filename, data, not stored))
    entries.insert(1, ('classes.dex', open(B + '/classes.dex', 'rb').read(), True))
    unsigned = aligned_zip(entries)
    key, cert = key_and_cert()
    signed = sign_v2(unsigned, key, cert)
    out = HERE + '/ZombieCity.apk'
    open(out, 'wb').write(signed)
    print('built', out, '%.1f KB' % (len(signed) / 1024))
    print('cert sha256', hashlib.sha256(cert.public_bytes(serialization.Encoding.DER)).hexdigest())

if __name__ == '__main__':
    main()
