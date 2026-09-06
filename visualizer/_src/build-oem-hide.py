#!/usr/bin/env python3
"""Software overlay: hide the Durango Front OEM header / roof-lip strip.

Does not rewrite signed plates. Writes fx/oem_hide_durango_front.png.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

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


def build_white(src, dest, depth=14, fade_h=6):
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
    # Rasterize at 3× so the windshield curve is anti-aliased, then downscale.
    scale = 3
    W, H = w * scale, h * scale
    big = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    top, bot = [], []
    for x in range(x0, x1):
        if contact[x] is None:
            continue
        if edge_fade(x / w) <= 0:
            continue
        y_top = contact[x] + 1
        top.append((x * scale, y_top * scale))
        bot.append((x * scale, (y_top + depth) * scale))
    if len(top) < 8:
        Image.new("RGBA", (w, h), (0, 0, 0, 0)).save(dest)
        return 0
    poly = top + list(reversed(bot))
    col = fallback
    draw.polygon(poly, fill=(col[0], col[1], col[2], 255))
    # vertical alpha fade on the lower third of the band
    pix = big.load()
    band_h = depth * scale
    fade_px = fade_h * scale
    for x in range(x0 * scale, x1 * scale):
        xf = (x / scale) / w
        ef = edge_fade(xf)
        if ef <= 0:
            continue
        # find first painted y in this column
        y_hit = None
        for y in range(int(H * 0.20), int(H * 0.30)):
            if pix[x, y][3] > 0:
                y_hit = y
                break
        if y_hit is None:
            continue
        for y in range(y_hit, min(H, y_hit + band_h + 2)):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            dy = y - y_hit
            va = 255
            if dy >= band_h - fade_px:
                va = int(255 * max(0, (band_h - dy) / fade_px))
            va = int(va * ef)
            pix[x, y] = (r, g, b, va)
    big = big.filter(ImageFilter.GaussianBlur(radius=1.6))
    out = big.resize((w, h), Image.Resampling.LANCZOS)
    out.save(dest)
    bb = out.getbbox()
    painted = 0
    if bb:
        painted = (bb[2] - bb[0]) * (bb[3] - bb[1])
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
