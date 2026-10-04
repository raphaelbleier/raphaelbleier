# Turns the GitHub avatar into the colored ASCII portrait used in the header block.
# Usage: python3 scripts/portrait.py 52 assets/portrait.json avatar.png
# Needs Pillow. Run only when the photo changes.
import json, sys
from PIL import Image, ImageDraw, ImageEnhance

W, out, src = int(sys.argv[1]), sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB').crop((40, 40, 360, 400))  # head + shoulders of a 400px avatar
# background mask: flood fill the grey backdrop from the edges
mask = im.copy()
for seed in [(0, 0), (mask.width - 1, 0), (0, mask.height // 2), (mask.width - 1, mask.height // 2)]:
    ImageDraw.floodfill(mask, seed, (255, 0, 255), thresh=48)
H = int(W * im.height / im.width * 0.5)  # characters are about twice as tall as wide
small = ImageEnhance.Contrast(im.resize((W, H), Image.LANCZOS)).enhance(1.35)
msk = mask.resize((W, H), Image.NEAREST)
ramp = " .'`:-=+*cox#%&@"

runs = []
for y in range(H):
    row, cur, buf = [], None, ''
    for x in range(W):
        if msk.getpixel((x, y)) == (255, 0, 255):
            ch, col = ' ', None
        else:
            r, g, b = small.getpixel((x, y))
            l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            ch = ramp[min(len(ramp) - 1, int(l ** 0.8 * (len(ramp) - 1)) + 1)]
            # lift dark tones so suit and hair stay visible on the terminal background
            col = '#%02x%02x%02x' % tuple(int(c * 0.65 + 255 * 0.35 * 0.55) for c in (r, g, b))
        if col != cur and buf:
            row.append([cur, buf])
            buf = ''
        cur = col
        buf += ch
    if buf:
        row.append([cur, buf])
    runs.append(row)
json.dump(runs, open(out, 'w'), separators=(',', ':'))
