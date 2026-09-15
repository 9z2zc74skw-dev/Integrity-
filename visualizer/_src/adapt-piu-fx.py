#!/usr/bin/env python3
"""Copy/adapt piu-lighting-visualizer fx into Integrity- visualizer/fx.

LOOK TARGET is piu photographic LED art — not 623-byte placeholders, not
product-card JPEGs, not color-keyed vehicle body. DynaFlare length files are
sliced from the piu 6-ft photos and scaled to a slim on-vehicle height so
T-FX-LOOK / T-DYNA-LOOK still see a stick, not a thumbnail.

Never recut plates. Never color-key white.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

VIZ = Path(__file__).resolve().parent.parent
FX = VIZ / "fx"
PIU = Path("/tmp/piu-lighting-visualizer/client/public/fx")

# On-vehicle stick height. Must stay <=80 for T-DYNA-LOOK natural dims.
DYNA_H = 64
# Match catalog draw box (w / DYNA_H=2.2) so a 1ft slice is still a stick, not a square thumb.
ASPECT = {"1ft": 8 / 2.2, "2ft": 14 / 2.2, "5ft": 32 / 2.2, "6ft": 38 / 2.2}


def trim(im: Image.Image, a_min: int = 16) -> Image.Image:
    a = im.split()[-1]
    bbox = a.point(lambda p, m=a_min: 255 if p > m else 0).getbbox()
    return im.crop(bbox) if bbox else im


def crop_housing(im: Image.Image) -> Image.Image:
    """Drop the bright ground reflection under the piu product photo."""
    im = trim(im)
    w, h = im.size
    px = im.load()
    y1 = h
    while y1 > h // 2:
        y = y1 - 1
        vals = []
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 80:
                vals.append((r + g + b) / 3)
        if vals and (sum(vals) / len(vals)) > 160:
            y1 = y
            continue
        break
    y0 = 0
    while y0 < h // 4:
        vals = []
        for x in range(w):
            r, g, b, a = px[x, y0]
            if a > 80:
                vals.append((r + g + b) / 3)
        if vals and (sum(vals) / len(vals)) > 160:
            y0 += 1
            continue
        break
    if y1 - y0 >= 24:
        im = im.crop((0, y0, w, y1))
    w, h = im.size
    shave = max(2, int(round(h * 0.10)))
    if h - shave >= 24:
        im = im.crop((0, 0, w, h - shave))
    return im


def pad_alpha(im: Image.Image, m: int = 4) -> Image.Image:
    out = Image.new("RGBA", (im.size[0] + 2 * m, im.size[1] + 2 * m), (0, 0, 0, 0))
    out.paste(im, (m, m), im)
    return out


def scale_h(im: Image.Image, h: int) -> Image.Image:
    w, orig_h = im.size
    nw = max(120, int(round(w * h / max(orig_h, 1))))
    return im.resize((nw, h), Image.Resampling.LANCZOS)


def fit_stick(im: Image.Image, aspect: float, h: int = DYNA_H) -> Image.Image:
    """Center-crop to catalog aspect, scale to slim stick height, true alpha corners."""
    im = crop_housing(im)
    w, orig_h = im.size
    need_w = int(round(orig_h * aspect))
    if need_w < w:
        x0 = max(0, (w - need_w) // 2)
        im = im.crop((x0, 0, x0 + need_w, orig_h))
    return pad_alpha(scale_h(im, h), 4)


def recolor_scheme(im: Image.Image, mode: str) -> Image.Image:
    """Derive bw/rw/rbw from an rb (or r/b) photographic stick. No color-key."""
    if mode == "rb":
        return im
    px = im.copy()
    w, h = px.size
    src = px.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 16:
                continue
            is_red = r > 140 and r > g + 35 and r > b + 35
            is_blu = b > 140 and b > r + 25 and b > g + 10
            if mode == "bw":
                if is_red:
                    src[x, y] = (min(255, b + 40), min(255, g + 50), 255, a)
            elif mode == "rw":
                if is_blu:
                    src[x, y] = (255, min(255, g + 50), min(255, r + 20), a)
            elif mode == "rbw":
                # Keep red/blue; lift the mid housing highlights toward white.
                if not is_red and not is_blu and r > 40:
                    lift = 18
                    src[x, y] = (min(255, r + lift), min(255, g + lift), min(255, b + lift), a)
    return px


def save(im: Image.Image, name: str) -> None:
    dest = FX / name
    im.save(dest, "PNG", optimize=True)
    print(f"  wrote {name} {im.size[0]}x{im.size[1]} {dest.stat().st_size}B")


def require_piu(name: str) -> Image.Image:
    p = PIU / name
    if not p.exists():
        raise SystemExit(f"missing piu fx {p}")
    return Image.open(p).convert("RGBA")


def build_dyna() -> None:
    sources = {
        "rb": require_piu("fx_dyna_rb.png"),
        "r": require_piu("fx_dyna_r.png"),
        "b": require_piu("fx_dyna_b.png"),
        "smk_rb": require_piu("fx_dyna_smk_rb.png"),
        "smk_r": require_piu("fx_dyna_smk_r.png"),
        "smk_b": require_piu("fx_dyna_smk_b.png"),
    }
    mode_src = {"rb": "rb", "rw": "r", "bw": "b", "rbw": "rb"}
    smk_src = {"rb": "smk_rb", "rw": "smk_r", "bw": "smk_b", "rbw": "smk_rb"}

    for label, asp in ASPECT.items():
        for mode, key in mode_src.items():
            stick = fit_stick(sources[key], asp)
            if mode == "rbw":
                stick = recolor_scheme(stick, "rbw")
            save(stick, f"fx_dyna_{label}_{mode}.png")

    for mode, key in smk_src.items():
        stick = fit_stick(sources[key], ASPECT["1ft"])
        if mode == "rbw":
            stick = recolor_scheme(stick, "rbw")
        save(stick, f"fx_dyna_1ft_smk_{mode}.png")
    save(fit_stick(sources["smk_rb"], ASPECT["1ft"]), "fx_dyna_1ft_smk.png")

    # Do not ship unused uncut 6-ft masters in the shop pack (catalog uses length files).
    for n in (
        "fx_dyna_r.png", "fx_dyna_b.png", "fx_dyna_rb.png",
        "fx_dyna_smk_r.png", "fx_dyna_smk_b.png", "fx_dyna_smk_rb.png",
        "fx_dyna_smk_bw.png", "fx_dyna_smk_rw.png", "fx_dyna_smk_rbw.png",
    ):
        p = FX / n
        if p.exists():
            p.unlink()
            print(f"  dropped unused {n}")


def build_mps_wide() -> None:
    rb = trim(require_piu("fx_wide_rb.png"))
    bw = trim(require_piu("fx_wide_bw.png"))
    save(rb, "fx_mps_wide_rb.png")
    save(bw, "fx_mps_wide_bw.png")
    save(recolor_scheme(rb, "rw"), "fx_mps_wide_rw.png")
    save(recolor_scheme(rb, "rbw"), "fx_mps_wide_rbw.png")
    # Generic MicroPulse row used by other MPS SKUs — same piu wide art, slightly shorter.
    short = rb.resize((max(280, rb.size[0] // 2), max(48, rb.size[1] // 2)), Image.Resampling.LANCZOS)
    save(short, "fx_mps_rb.png")
    save(bw.resize(short.size, Image.Resampling.LANCZOS), "fx_mps_bw.png")
    save(recolor_scheme(short, "rw"), "fx_mps_rw.png")
    save(recolor_scheme(short, "rbw"), "fx_mps_rbw.png")


def build_algt() -> None:
    rb = trim(require_piu("fx_algt_rb.png"))
    bw = trim(require_piu("fx_algt_bw.png"))
    save(rb, "fx_algt_max.png")
    save(bw, "fx_algt_max_bw.png")
    save(recolor_scheme(rb, "rw"), "fx_algt_max_rw.png")
    save(recolor_scheme(rb, "rbw"), "fx_algt_max_rbw.png")


def build_stick() -> None:
    rb = trim(require_piu("fx_stick_rb.png"))
    bw = trim(require_piu("fx_stick_bw.png"))
    save(rb, "fx_stick_rb.png")
    save(bw, "fx_stick_bw.png")
    save(recolor_scheme(rb, "rw"), "fx_stick_rw.png")
    save(recolor_scheme(rb, "rbw"), "fx_stick_rbw.png")


def build() -> None:
    if not PIU.is_dir():
        raise SystemExit(f"clone piu-lighting-visualizer fx to {PIU}")
    FX.mkdir(exist_ok=True)
    print("DynaFlare from piu photos")
    build_dyna()
    print("MPS wide / MicroPulse from piu fx_wide")
    build_mps_wide()
    print("ALGT from piu fx_algt")
    build_algt()
    print("Hatch sticks from piu fx_stick")
    build_stick()
    print("done")


if __name__ == "__main__":
    build()
