# -*- coding: utf-8 -*-
"""調律ノート PWA アイコン生成（ティール地＋鍵盤モチーフ）"""
from PIL import Image, ImageDraw

OUT = r"C:\Users\d150059\AppData\Local\Temp\claude\C--Users-d150059-workspace-rootgit\f887eca5-388a-41ba-ade1-3bd65fe0d43e\scratchpad\deploy"
S = 1024
TEAL = (14, 143, 131)
TEAL_DK = (9, 106, 96)
IVORY = (246, 242, 234)
SEAM = (198, 190, 174)
EBONY = (23, 20, 15)

img = Image.new("RGB", (S, S), TEAL)
d = ImageDraw.Draw(img)

# 背景を上下でわずかにグラデ（下を少し濃く）
for y in range(S):
    t = y / S
    r = int(TEAL[0] * (1 - t * 0.18) )
    g = int(TEAL[1] * (1 - t * 0.18) )
    b = int(TEAL[2] * (1 - t * 0.18) )
    d.line([(0, y), (S, y)], fill=(r, g, b))

# 鍵盤ブロック（中央）
kb_w = int(S * 0.62)
kb_h = int(S * 0.42)
kb_x = (S - kb_w) // 2
kb_y = (S - kb_h) // 2 + int(S * 0.02)
rad = int(S * 0.045)
d.rounded_rectangle([kb_x, kb_y, kb_x + kb_w, kb_y + kb_h], radius=rad, fill=IVORY)

# 白鍵の仕切り線（7鍵）
n_white = 7
kw = kb_w / n_white
for i in range(1, n_white):
    x = kb_x + int(i * kw)
    d.line([(x, kb_y + int(kb_h * 0.06)), (x, kb_y + kb_h - int(kb_h * 0.06))], fill=SEAM, width=max(2, S // 340))

# 黒鍵（C#,D#,F#,G#,A# = 仕切り 1,2,4,5,6 の上）
black_seams = [1, 2, 4, 5, 6]
bk_w = int(kw * 0.56)
bk_h = int(kb_h * 0.60)
for s in black_seams:
    cx = kb_x + int(s * kw)
    d.rounded_rectangle([cx - bk_w // 2, kb_y, cx + bk_w // 2, kb_y + bk_h],
                        radius=int(bk_w * 0.18), fill=EBONY)

# 上部に音叉（チューニングフォーク）を小さく
fx = S // 2
fork_top = int(S * 0.13)
fork_bottom = kb_y - int(S * 0.03)
prong_gap = int(S * 0.05)
lw = max(6, S // 90)
# 2本の脚
d.line([(fx - prong_gap, fork_top), (fx - prong_gap, fork_bottom - int(S*0.06))], fill=IVORY, width=lw)
d.line([(fx + prong_gap, fork_top), (fx + prong_gap, fork_bottom - int(S*0.06))], fill=IVORY, width=lw)
# U字（下の弧）
d.arc([fx - prong_gap, fork_bottom - int(S*0.11), fx + prong_gap, fork_bottom - int(S*0.01)],
      start=0, end=180, fill=IVORY, width=lw)
# 柄
d.line([(fx, fork_bottom - int(S*0.055)), (fx, fork_bottom)], fill=IVORY, width=lw)

# 書き出し
for size, name in [(1024, "icon-1024.png"), (512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(f"{OUT}\\{name}")
    print("wrote", name)

# マスカブル用の余白付き（Android用・安全域）
mask = Image.new("RGB", (S, S), TEAL)
inner = img.resize((int(S * 0.78), int(S * 0.78)), Image.LANCZOS)
mask.paste(inner, ((S - inner.width) // 2, (S - inner.height) // 2))
mask.resize((512, 512), Image.LANCZOS).save(f"{OUT}\\icon-maskable-512.png")
print("wrote icon-maskable-512.png")
print("done")
