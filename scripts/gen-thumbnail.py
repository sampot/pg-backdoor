#!/usr/bin/env python3
"""Generate 640x480 gameplay thumbnail from fortress map data."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROWS = [
    "############################",
    "#,,v.......####.......T,,,,#",
    "#..####....#  #....####....#",
    "#..#  #....#  #....#  #....#",
    "#..####....####....####....#",
    "#..........................#",
    "#..,,,,......VV......,,,,..#",
    "#..,,,,................,,,,#",
    "#....####....####....####..#",
    "#....#  #....#  #....#  #..#",
    "#....####....####....####..#",
    "#..........................#",
    "#..C....................C..#",
    "#.####.####.####.####.####.#",
    "#.#  #.#  #.#  #.#  #.#  #.#",
    "#.#  #.#  #.#  #.#  #.#  #.#",
    "#.####.####.####.####.####.#",
    "#...........E..............#",
    "############################",
]

COLORS = {
    "#": (26, 34, 48),
    ".": (30, 40, 54),
    ",": (18, 28, 40),
    "v": (20, 36, 52),
    "T": (40, 90, 120),
    "C": (120, 90, 50),
    "V": (255, 107, 95),
    "E": (126, 226, 176),
    "x": (74, 56, 40),
    "g": (90, 70, 40),
    " ": (30, 40, 54),
}

W, H = 640, 480
TILE = min(W // len(ROWS[0]), H // len(ROWS))
OX = (W - len(ROWS[0]) * TILE) // 2
OY = (H - len(ROWS) * TILE) // 2

img = Image.new("RGB", (W, H), (11, 13, 16))
draw = ImageDraw.Draw(img)

for y, row in enumerate(ROWS):
    for x, ch in enumerate(row):
        px, py = OX + x * TILE, OY + y * TILE
        draw.rectangle([px, py, px + TILE, py + TILE], fill=COLORS.get(ch, (30, 40, 54)))

# player, guards, camera cones
px, py = OX + int(14.5 * TILE), OY + int(8.5 * TILE)
draw.ellipse([px - 8, py - 8, px + 8, py + 8], fill=(126, 226, 176))
for gx, gy in [(8.5, 5.5), (20.5, 14.5)]:
    gx = OX + int(gx * TILE)
    gy = OY + int(gy * TILE)
    draw.ellipse([gx - 7, gy - 7, gx + 7, gy + 7], fill=(196, 68, 68))

draw.rectangle([0, 0, W, 28], fill=(8, 10, 14, 200))
try:
    font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 16)
except Exception:
    font = ImageFont.load_default()
draw.text((12, 6), "後門任務 · 通風管潛入", fill=(232, 240, 248), font=font)
draw.text((W - 170, 8), "警報 18%", fill=(255, 107, 95), font=font)

out = ROOT / "thumbnail.png"
img.save(out, optimize=True, compress_level=9)
print(f"wrote {out} ({out.stat().st_size} bytes)")
