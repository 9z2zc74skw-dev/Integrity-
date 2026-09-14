#!/usr/bin/env python3
"""Rebuild DynaFlare FX from piu product photos.

Copies 9z2zc74skw-dev/piu-lighting-visualizer master fx_dyna*.png, trims the
keyed paper-fringe under the housing (NOT a white-body color key — LED bloom
and chrome highlights stay), then cuts end-capped 1/2/5/6 ft sticks plus
scheme variants. Writes visualizer/fx/fx_dyna*.png.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

VIZ = Path(__file__).resolve().parent.parent
FX = VIZ / "fx"
PIU = Path("/tmp/piu-lighting-visualizer/client/public/fx")

# Lengths as module counts per color (full bar is 6 red + 6 blue).
LENGTHS = {"1ft": 1, "2ft": 2, "5ft": 5, "6ft": 6}


def copy_piu_masters() -> None:
    names = [
        "fx_dyna_rb.png",
        "fx_dyna_r.png",
        "fx_dyna_b.png",
        "fx_dyna_smk_rb.png",
        "fx_dyna_smk_r.png",
        "fx_dyna_smk_b.png",
    ]
    for n in names:
        src = PIU / n
        if not src.exists():
            raise SystemExit(f"missing piu sprite {src}")
        shutil.copy2(src, FX / n)


def is_paper(r: int, g: int, b: int, a: int) -> bool:
    """Studio-backdrop remnant under the housing. Not LED white, not chrome."""
    if a < 8:
        return True
    mx, mn = max(r, g, b), min(r, g, b)
    chroma = mx - mn
    # Paper / jagged keyed fringe: bright, low-chroma, or gray mountain bits
    # hanging off the bottom rail. LED bloom is high-chroma red or blue.
    red_led = r > 140 and r > g + 35 and r > b + 35
    blu_led = b > 140 and b > r + 35 and b > g + 20
    if red_led or blu_led:
        return False
    if mx > 185 and chroma < 45:
        return True
    if mx > 90 and chroma < 22 and mn > 70:
        return True
    return False


def trim_housing(im: Image.Image) -> Image.Image:
    """Drop bottom paper-fringe; keep housing rail, chrome, and LED bloom.

    The remnant is a jagged white/black mountain strip under the bar, leftover
    from keying a studio photo. LED white bloom lives in the lens (high chroma,
    mid-bar). Never key those, and never key a vehicle body.
    """
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    paper_rows = []
    led_rows = []
    dark_rows = []
    for y in range(h):
        paper = led = dark = 0
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            mx = max(r, g, b)
            if r > 150 and r > g + 40 and r > b + 40:
                led += 1
            elif b > 150 and b > r + 40 and b > g + 20:
                led += 1
            elif is_paper(r, g, b, a):
                paper += 1
            elif mx < 80:
                dark += 1
        paper_rows.append(paper)
        led_rows.append(led)
        dark_rows.append(dark)

    # Peak LED row. Walk down while the row is still lens/housing, not paper.
    # Paper-surge detection is restricted to the lower third so LED bloom
    # (bright, low-chroma cores) cannot be mistaken for the keyed fringe.
    peak = max(range(h), key=lambda y: led_rows[y])
    lens_bot = peak
    remnant_y = h
    paper_cut = max(40, int(w * 0.04))
    y_fringe = int(h * 0.62)
    for y in range(peak, h):
        if y >= y_fringe and paper_rows[y] > paper_cut and paper_rows[y] >= led_rows[y] * 0.45:
            remnant_y = y
            break
        if led_rows[y] > max(30, w * 0.05) or dark_rows[y] > w * 0.20:
            lens_bot = y

    # Keep the dark underside rail, but stop the instant paper mountains start.
    crop_bot = min(h, remnant_y, lens_bot + 1)

    for y in range(crop_bot, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (r, g, b, 0)

    # Paper pixels that leaked into the last rail rows — punch those only.
    for y in range(max(0, crop_bot - 6), crop_bot):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and is_paper(r, g, b, a):
                px[x, y] = (r, g, b, 0)

    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - 1)
    t = max(0, t - 1)
    r = min(w, r + 1)
    b = min(h, b + 1)
    return im.crop((l, t, r, b))


def opaque_x(im: Image.Image) -> tuple[int, int]:
    px = im.load()
    w, h = im.size
    left = next(x for x in range(w) if any(px[x, y][3] > 16 for y in range(h)))
    right = next(x for x in range(w - 1, -1, -1) if any(px[x, y][3] > 16 for y in range(h)))
    return left, right


def stitch_length(im: Image.Image, modules: int) -> Image.Image:
    """Endcap + N red modules + N blue modules + endcap. 6 modules = full bar."""
    im = im.convert("RGBA")
    w, h = im.size
    left, right = opaque_x(im)
    bar_w = right - left + 1
    if modules >= 6:
        return im.crop((left, 0, right + 1, h))

    end = max(36, int(bar_w * 0.034))
    inner = bar_w - 2 * end
    half = inner // 2
    mod = max(1, half // 6)
    take = mod * modules

    red = im.crop((left + end, 0, left + end + take, h))
    blue = im.crop((right - end - take + 1, 0, right - end + 1, h))
    cap_l = im.crop((left, 0, left + end, h))
    cap_r = im.crop((right - end + 1, 0, right + 1, h))

    out_w = cap_l.width + red.width + blue.width + cap_r.width
    out = Image.new("RGBA", (out_w, h), (0, 0, 0, 0))
    x = 0
    for part in (cap_l, red, blue, cap_r):
        out.paste(part, (x, 0), part)
        x += part.width
    return out


def is_housing(r: int, g: int, b: int, a: int) -> bool:
    if a < 16:
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 95:
        return True
    if mx - mn < 18 and mx < 140:
        return True
    return False


def remap_led(r: int, g: int, b: int, mode: str) -> tuple[int, int, int]:
    """Shift warning LED hue. Housing pixels are skipped by the caller."""
    red = r > 90 and r >= g + 18 and r >= b + 18
    blu = b > 90 and b >= r + 18 and b >= g + 12
    if mode == "bw" and red:
        mx = max(r, int((g + b) * 0.35 + r * 0.55))
        return mx, min(255, int(mx * 0.98)), min(255, int(mx * 0.96))
    if mode == "rw" and blu:
        mx = max(b, int((r + g) * 0.35 + b * 0.55))
        return min(255, int(mx * 0.98)), min(255, int(mx * 0.97)), mx
    if mode == "rbw":
        # Keep red and blue; punch a white core on the hottest cells.
        if red and r > 210:
            return 255, 248, 242
        if blu and b > 210:
            return 242, 248, 255
    return r, g, b


def scheme_variant(im: Image.Image, mode: str) -> Image.Image:
    if mode == "rb":
        return im
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16 or is_housing(r, g, b, a):
                continue
            nr, ng, nb = remap_led(r, g, b, mode)
            px[x, y] = (nr, ng, nb, a)
    return out


def save(im: Image.Image, name: str) -> None:
    dest = FX / name
    im.save(dest, "PNG", optimize=True)
    print(f"  wrote {name} {im.size[0]}x{im.size[1]}")


def build() -> None:
    if not PIU.exists():
        raise SystemExit(f"clone piu first: {PIU}")
    FX.mkdir(exist_ok=True)
    copy_piu_masters()

    clear = trim_housing(Image.open(FX / "fx_dyna_rb.png"))
    smoked = trim_housing(Image.open(FX / "fx_dyna_smk_rb.png"))
    # Keep trimmed masters as the canonical product shots (overwrite copies).
    save(clear, "fx_dyna_rb.png")
    save(smoked, "fx_dyna_smk_rb.png")
    for src_name in ("fx_dyna_r.png", "fx_dyna_b.png", "fx_dyna_smk_r.png", "fx_dyna_smk_b.png"):
        save(trim_housing(Image.open(FX / src_name)), src_name)

    for label, n in LENGTHS.items():
        stick = stitch_length(clear, n)
        for mode in ("rb", "bw", "rw", "rbw"):
            save(scheme_variant(stick, mode), f"fx_dyna_{label}_{mode}.png")

    smk_1 = stitch_length(smoked, 1)
    for mode in ("rb", "bw", "rw", "rbw"):
        save(scheme_variant(smk_1, mode), f"fx_dyna_1ft_smk_{mode}.png")
    # Catalog historically used fx_dyna_1ft_smk.png (no scheme suffix).
    save(smk_1, "fx_dyna_1ft_smk.png")

    smk_full = smoked
    for mode in ("rb", "bw", "rw", "rbw"):
        save(scheme_variant(smk_full, mode), f"fx_dyna_smk_{mode}.png")


if __name__ == "__main__":
    build()
