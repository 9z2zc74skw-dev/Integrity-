#!/usr/bin/env python3
"""Software overlay: hide the Durango Front OEM header / roof-lip strip.

Does not rewrite signed plates. Writes fx/oem_hide_durango_front.png.
"""
from pathlib import Path
from PIL import Image, ImageFilter

VIZ = Path(__file__).resolve().parent.parent
FX = VIZ / "fx"


def luma(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def chroma(p):
    return max(p[0], p[1], p[2]) - min(p[0], p[1], p[2])


def is_roof_white(p):
    return min(p[0], p[1], p[2]) > 200 and chroma(p) < 30


def smooth(vals, win=15):
    out = vals[:]
    n = len(vals)
    r = win // 2
    for i in range(n):
        chunk = [vals[j] for j in range(max(0, i - r), min(n, i + r + 1)) if vals[j] is not None]
        if chunk:
            out[i] = int(round(sum(chunk) / len(chunk)))
    return out


def edge_fade(xf, x0=0.262, x1=0.738, fade=0.028):
    if xf < x0 or xf > x1:
        return 0.0
    if xf < x0 + fade:
        return (xf - x0) / fade
    if xf > x1 - fade:
        return (x1 - xf) / fade
    return 1.0


def build_white(src, dest, depth=11, fade_h=5):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()
    x0, x1 = int(w * 0.262), int(w * 0.738)
    contact = [None] * w
    sample = [None] * w
    for x in range(x0, x1):
        whites = [y for y in range(int(h * 0.214), int(h * 0.250)) if is_roof_white(px[x, y])]
        if len(whites) < 2:
            continue
        contact[x] = whites[-1]
        sy = whites[max(0, len(whites) - 4)]
        sample[x] = px[x, sy]
    last = None
    for x in range(x0, x1):
        if contact[x] is None and last is not None:
            nxt = None
            for k in range(x + 1, min(x1, x + 8)):
                if contact[k] is not None:
                    nxt = contact[k]
                    break
            if nxt is not None:
                contact[x] = last if abs(last - nxt) > 40 else int((last + nxt) / 2)
        if contact[x] is not None:
            last = contact[x]
    contact = smooth(contact, 21)
    samples = [s for s in sample if s]
    fallback = samples[len(samples) // 2] if samples else (252, 252, 252)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    painted = 0
    for x in range(x0, x1):
        if contact[x] is None:
            continue
        fade = edge_fade(x / w)
        if fade <= 0:
            continue
        col = sample[x] or fallback
        y_top = contact[x] + 1
        for dy in range(depth):
            y = y_top + dy
            if y >= h:
                break
            a = 255
            if dy >= depth - fade_h:
                a = int(255 * (depth - dy) / fade_h)
            a = int(max(0, min(255, a * fade)))
            if a <= 0:
                continue
            op[x, y] = (col[0], col[1], col[2], a)
            painted += 1
    out = out.filter(ImageFilter.GaussianBlur(radius=0.7))
    out.save(dest)
    return painted


def preview(plate, overlay, dest, box):
    base = Image.open(plate).convert("RGBA")
    ov = Image.open(overlay).convert("RGBA")
    base.alpha_composite(ov)
    crop = base.crop(box)
    crop.save(dest)
    crop.resize((crop.size[0] * 2, crop.size[1] * 2), Image.NEAREST).save(
        dest.with_name(dest.stem + "_2x" + dest.suffix)
    )


if __name__ == "__main__":
    white = FX / "oem_hide_durango_front.png"
    n = build_white(VIZ / "durango_front.png", white)
    print(f"white overlay pixels={n} -> {white}")
    # drop the useless black overlay if present
    black = FX / "oem_hide_durango_front_black.png"
    if black.exists():
        black.unlink()
        print("removed empty black overlay")
    qa = Path("/tmp")
    plate = VIZ / "durango_front.png"
    before = Image.open(plate)
    box_corner = (90, 170, 480, 400)
    box_mid = (260, 200, 760, 360)
    before.crop(box_corner).save(qa / "oem_hide_front_before.png")
    before.crop(box_mid).save(qa / "oem_hide_front_mid_before.png")
    preview(plate, white, qa / "oem_hide_front_after.png", box_corner)
    preview(plate, white, qa / "oem_hide_front_mid_after.png", box_mid)
    print("qa crops in /tmp/oem_hide_front_*.png")
