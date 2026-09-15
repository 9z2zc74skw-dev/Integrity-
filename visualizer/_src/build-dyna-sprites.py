#!/usr/bin/env python3
"""Rebuild DynaFlare FX as slim on-vehicle sticks.

piu-lighting-visualizer master photos are good 6-ft product shots, but a 1-ft
crop of that head-on JPEG is a tiny uncropped product card on glass (HEAD 200
does not catch that). This pass draws capsule housing + LED cells with true
alpha. LED hues are sampled from the piu photo when present. Never color-key
a vehicle body.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

VIZ = Path(__file__).resolve().parent.parent
FX = VIZ / "fx"
PIU = Path("/tmp/piu-lighting-visualizer/client/public/fx")

# Pixel height of every stick. Width grows with module count so CSS
# object-fit:fill keeps constant thickness (DYNA_H) on the plate.
H = 40
# Catalog width / DYNA_H (2.2) * H — sprite aspect matches the on-plate box
# so object-fit:fill does not squash a product-card JPEG into a thumbnail.
WIDTH = {"1ft": 146, "2ft": 255, "5ft": 582, "6ft": 691}
LENGTHS = {"1ft": 1, "2ft": 2, "5ft": 5, "6ft": 6}


def sample_led_colors() -> dict[str, tuple[int, int, int]]:
    """Pull real DynaFlare LED hues from piu product art when available."""
    out = {
        "red": (230, 28, 32),
        "blue": (28, 92, 255),
        "white": (248, 250, 255),
        "core_r": (255, 210, 180),
        "core_b": (210, 230, 255),
    }
    src = PIU / "fx_dyna_rb.png"
    if not src.exists():
        return out
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    reds, blues = [], []
    for y in range(int(h * 0.25), int(h * 0.75)):
        for x in range(int(w * 0.08), int(w * 0.92)):
            r, g, b, a = px[x, y]
            if a < 200:
                continue
            if r > 160 and r > g + 50 and r > b + 50:
                reds.append((r, g, b))
            elif b > 160 and b > r + 40 and b > g + 20:
                blues.append((r, g, b))
    if reds:
        n = len(reds)
        out["red"] = tuple(sum(c[i] for c in reds) // n for i in range(3))  # type: ignore
        hot = max(reds, key=lambda c: c[0])
        out["core_r"] = hot
    if blues:
        n = len(blues)
        out["blue"] = tuple(sum(c[i] for c in blues) // n for i in range(3))  # type: ignore
        hot = max(blues, key=lambda c: c[2])
        out["core_b"] = hot
    return out


LEDS = sample_led_colors()


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore


def cell_color(side: str, mode: str, smoked: bool) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    red, blue, white = LEDS["red"], LEDS["blue"], LEDS["white"]
    cr, cb = LEDS["core_r"], LEDS["core_b"]
    if mode == "bw":
        body, core = (blue, cb) if side == "L" else (white, (255, 255, 255))
    elif mode == "rw":
        body, core = (red, cr) if side == "L" else (white, (255, 255, 255))
    elif mode == "rbw":
        if side == "L":
            body, core = red, (255, 248, 242)
        else:
            body, core = blue, (242, 248, 255)
    else:
        body, core = (red, cr) if side == "L" else (blue, cb)
    if smoked:
        body = tuple(max(0, int(v * 0.62)) for v in body)  # type: ignore
        core = tuple(max(0, int(v * 0.78)) for v in core)  # type: ignore
    return body, core


def draw_stick(modules: int, smoked: bool, mode: str, width: int) -> Image.Image:
    n = max(1, modules)
    w = int(width)
    im = Image.new("RGBA", (w, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    y0, y1 = 3, H - 4
    rad = 8
    end = max(16, int(w * 0.08))
    split = max(4, int(w * 0.018))
    inner_w = max(n * 2, w - 2 * end - split)
    cell = max(8, inner_w // (n * 2))
    house = (20, 20, 22, 255) if not smoked else (12, 12, 14, 255)
    edge = (6, 6, 8, 255)
    d.rounded_rectangle((1, y0, w - 2, y1), radius=rad, fill=house, outline=edge, width=1)
    # top chrome rail — highlight, not a vehicle-body key
    d.line((2 + rad, y0, w - 3 - rad, y0), fill=(90, 92, 98, 220), width=1)
    # endcap blocks (DynaFlare housing, not a catalog thumbnail)
    cap = (16, 16, 18, 255) if not smoked else (10, 10, 12, 255)
    d.rectangle((2, y0 + 2, end - 1, y1 - 2), fill=cap)
    d.rectangle((w - end, y0 + 2, w - 3, y1 - 2), fill=cap)

    lens_y0, lens_y1 = y0 + 6, y1 - 6
    lens_fill = (10, 10, 12, 255) if not smoked else (6, 6, 8, 255)
    d.rounded_rectangle((end - 2, lens_y0, w - end + 1, lens_y1), radius=4, fill=lens_fill)

    def paint_row(side: str, x0: int) -> None:
        body, core = cell_color(side, mode, smoked)
        rr = max(5, min(8, cell // 3))
        for i in range(n):
            cx = x0 + i * cell + cell // 2
            cy = H // 2
            for extra, a in ((rr + 4, 40), (rr + 2, 70), (rr, 110)):
                d.ellipse((cx - extra, cy - extra + 1, cx + extra, cy + extra - 1), fill=body + (a,))
            d.ellipse((cx - rr, cy - rr + 1, cx + rr, cy + rr - 1), fill=body + (255,))
            cr = max(2, rr // 2)
            d.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=core + (255,))

    paint_row("L", end)
    paint_row("R", end + n * cell + split)
    mid = end + n * cell + split // 2
    d.line((mid, lens_y0 + 1, mid, lens_y1 - 1), fill=(4, 4, 6, 180), width=2)
    return im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=2))


def save(im: Image.Image, name: str) -> None:
    dest = FX / name
    im.save(dest, "PNG", optimize=True)
    print(f"  wrote {name} {im.size[0]}x{im.size[1]} {dest.stat().st_size}B")


def build() -> None:
    FX.mkdir(exist_ok=True)
    # Drop unused solid-color / uncut product-card masters from the shop pack.
    # Length + scheme files are what the catalog actually requests.
    unused = [
        "fx_dyna_r.png", "fx_dyna_b.png",
        "fx_dyna_smk_r.png", "fx_dyna_smk_b.png",
        "fx_dyna_rb.png", "fx_dyna_smk_rb.png",
        "fx_dyna_smk_bw.png", "fx_dyna_smk_rw.png", "fx_dyna_smk_rbw.png",
    ]
    for n in unused:
        p = FX / n
        if p.exists():
            p.unlink()
            print(f"  dropped unused {n}")

    for label, n in LENGTHS.items():
        ww = WIDTH[label]
        for mode in ("rb", "bw", "rw", "rbw"):
            save(draw_stick(n, False, mode, ww), f"fx_dyna_{label}_{mode}.png")

    smk_w = WIDTH["1ft"]
    smk_1 = draw_stick(1, True, "rb", smk_w)
    for mode in ("rb", "bw", "rw", "rbw"):
        save(draw_stick(1, True, mode, smk_w), f"fx_dyna_1ft_smk_{mode}.png")
    save(smk_1, "fx_dyna_1ft_smk.png")


if __name__ == "__main__":
    build()
