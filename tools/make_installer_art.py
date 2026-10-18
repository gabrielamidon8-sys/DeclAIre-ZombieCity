"""Draws the Windows installer's pictures (the welcome panel, the header strip and the icon) from the game's icon and
fonts. Run once after changing the art: python3 tools/make_installer_art.py"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
Z = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(Z, 'desktop', 'installer')
os.makedirs(OUT, exist_ok=True)
icon = Image.open(os.path.join(Z, 'desktop', 'icon.png')).convert('RGBA')
stencil = lambda s: ImageFont.truetype(os.path.join(Z, 'fonts', 'SairaStencilOne-Regular.woff'), s)
mono = lambda s: ImageFont.truetype(os.path.join(Z, 'fonts', 'ShareTechMono-Regular.ttf'), s)
BONE, TAPE, NIGHT = (235, 229, 214), (242, 204, 58), (11, 13, 16)

def backdrop(w, h):
    im = Image.new('RGB', (w, h), NIGHT)
    glow = Image.new('RGB', (w, h), (0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((-w * 0.6, h * 0.62, w * 1.6, h * 1.5), fill=(120, 30, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.35))
    return Image.blend(im, glow, 0.55)

# welcome / finish panel (164 x 314)
w, h = 164, 314
im = backdrop(w, h); d = ImageDraw.Draw(im)
# quarantine tape across the top
tape = Image.new('RGBA', (w * 2, 22), TAPE + (255,)); td = ImageDraw.Draw(tape)
for x in range(0, w * 2, 16): td.polygon([(x, 0), (x + 8, 0), (x + 2, 4), (x - 6, 4)], fill=(23, 20, 11, 255)); td.polygon([(x, 18), (x + 8, 18), (x + 2, 22), (x - 6, 22)], fill=(23, 20, 11, 255))
td.text((8, 4), 'QUARANTINE ZONE · DO NOT ENTER · QUARANTINE ZONE', font=mono(11), fill=(23, 20, 11, 255))
tape = tape.rotate(-8, expand=True, resample=Image.BICUBIC)
im.paste(tape, (-30, 18), tape)
sk = icon.resize((118, 118), Image.LANCZOS)
im.paste(sk, ((w - 118) // 2, 70), sk)
d.text((w // 2, 206), 'ZOMBIE', font=stencil(34), fill=BONE, anchor='mm')
d.text((w // 2, 238), 'CITY', font=stencil(34), fill=TAPE, anchor='mm')
d.text((w // 2, 278), 'DECLAIRE STUDIOS', font=mono(10), fill=(143, 149, 158), anchor='mm')
im.save(os.path.join(OUT, 'welcome.bmp'))

# header strip (150 x 57), shown on the right of the top band
w, h = 150, 57
im = Image.new('RGB', (w, h), NIGHT); d = ImageDraw.Draw(im)
sk = icon.resize((44, 44), Image.LANCZOS); im.paste(sk, (w - 50, 6), sk)
d.text((w - 56, 20), 'ZOMBIE', font=stencil(17), fill=BONE, anchor='rm')
d.text((w - 56, 38), 'CITY', font=stencil(17), fill=TAPE, anchor='rm')
im.save(os.path.join(OUT, 'header.bmp'))

# the setup and uninstall icon
icon.save(os.path.join(OUT, 'icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('installer art in', OUT, os.listdir(OUT))
