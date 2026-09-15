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


def copy_scheme(src_rb: Image.Image, src_bw: Image.Image, dest_prefix: str) -> None:
    """Trim photographic piu art and derive rw/rbw. No color-key."""
    rb = pad_alpha(trim(src_rb), 4)
    bw = pad_alpha(trim(src_bw), 4)
    save(rb, f"{dest_prefix}_rb.png")
    save(bw, f"{dest_prefix}_bw.png")
    save(recolor_scheme(rb, "rw"), f"{dest_prefix}_rw.png")
    save(recolor_scheme(rb, "rbw"), f"{dest_prefix}_rbw.png")


def make_mpsw9_pod(src: Image.Image) -> Image.Image:
    """Compact MicroPulse Wide Angle pod — not a 12-LED lightbar strip.

    MPSW9 is a short dual-color head for a mirror bracket. Crop TWO LED cells
    (one red, one blue) at the split of piu fx_wide and keep the photographic
    housing. A 36% / 6-LED slice still reads as a mini bar on the mirror arm.
    """
    im = trim(src)
    w, h = im.size
    # ~2 LED cells at the R/B split (12-LED source).
    cw = min(w, max(int(round(w * 0.16)), 64))
    x0 = max(0, (w - cw) // 2)
    core = im.crop((x0, 0, x0 + cw, h))
    # Keep it chunky: never flatten into a strip.
    cw, ch = core.size
    if cw / max(ch, 1) > 1.6:
        need_w = max(64, int(round(ch * 1.35)))
        if need_w < cw:
            x1 = max(0, (cw - need_w) // 2)
            core = core.crop((x1, 0, x1 + need_w, ch))
    return pad_alpha(core, 4)


def build_mpsw9() -> None:
    rb = make_mpsw9_pod(require_piu("fx_wide_rb.png"))
    bw = make_mpsw9_pod(require_piu("fx_wide_bw.png"))
    save(rb, "fx_mpsw9_rb.png")
    save(bw, "fx_mpsw9_bw.png")
    save(recolor_scheme(rb, "rw"), "fx_mpsw9_rw.png")
    save(recolor_scheme(rb, "rbw"), "fx_mpsw9_rbw.png")
    # Do not leave the 12-LED lightbar wired as MPSW9.
    for n in ("fx_mps_wide_rb.png", "fx_mps_wide_bw.png", "fx_mps_wide_rw.png", "fx_mps_wide_rbw.png"):
        p = FX / n
        if p.exists():
            p.unlink()
            print(f"  dropped unused {n}")


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


def build_ils() -> None:
    """Connected visor photograph. CSS ils-half clips L/R shrouds."""
    copy_scheme(require_piu("fx_ils_rb.png"), require_piu("fx_ils_bw.png"), "fx_ils")


def build_mps63() -> None:
    """MicroPulse 6-3 grille — piu fx_bar dual-row photo, not CGI."""
    copy_scheme(require_piu("fx_bar_rb.png"), require_piu("fx_bar_bw.png"), "fx_mps63")


def build_mps123() -> None:
    """MicroPulse 12-3 hatch — same photographic bar family as piu MPS123."""
    copy_scheme(require_piu("fx_bar_rb.png"), require_piu("fx_bar_bw.png"), "fx_mps123")


def build_xsm2() -> None:
    """SpectraLux XSM2 — piu fx_module photo, not a dual-row CGI thumb."""
    copy_scheme(require_piu("fx_module_rb.png"), require_piu("fx_module_bw.png"), "fx_xsm2")
    for n in (
        "fx_mps_small_rb.png", "fx_mps_small_bw.png",
        "fx_mps_small_rw.png", "fx_mps_small_rbw.png",
        "fx_mps_rb.png", "fx_mps_bw.png", "fx_mps_rw.png", "fx_mps_rbw.png",
    ):
        p = FX / n
        if p.exists():
            p.unlink()
            print(f"  dropped unused {n}")


def build_round_smk() -> None:
    """1 in smoked perimeter — piu fx_round_smk photo, not CGI disc."""
    copy_scheme(
        require_piu("fx_round_smk_rb.png"),
        require_piu("fx_round_smk_bw.png"),
        "fx_round_smk",
    )
    p = FX / "fx_round_smk.png"
    if p.exists():
        p.unlink()
        print("  dropped unused fx_round_smk.png")


def build_pushbar() -> None:
    save(trim(require_piu("fx_pushbar_front.png")), "fx_pushbar_front.png")


def build() -> None:
    if not PIU.is_dir():
        raise SystemExit(f"clone piu-lighting-visualizer fx to {PIU}")
    FX.mkdir(exist_ok=True)
    print("DynaFlare from piu photos")
    build_dyna()
    print("MPSW9 compact wide-angle pod from piu fx_wide crop")
    build_mpsw9()
    print("ALGT from piu fx_algt")
    build_algt()
    print("Hatch sticks from piu fx_stick")
    build_stick()
    print("ILS visor from piu fx_ils")
    build_ils()
    print("MPS63 grille from piu fx_bar")
    build_mps63()
    print("MPS123 hatch from piu fx_bar")
    build_mps123()
    print("XSM2 from piu fx_module")
    build_xsm2()
    print("Smoked rounds from piu fx_round_smk")
    build_round_smk()
    print("Push bar from piu")
    build_pushbar()
    print("done")


if __name__ == "__main__":
    build()
