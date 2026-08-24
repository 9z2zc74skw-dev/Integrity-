# Durango Lighting Visualizer

Interactive sales/quote visualizer for **Dodge Durango Pursuit** lighting builds (Integrity Upfitters).

This folder is the editable source of truth for the Durango milestone. Do **not** edit `compiled-app/` as source — that Vite bundle is reference-only (UX/asset mining).

## Run locally

From the repo root:

```bash
npx --yes serve visualizer
```

Then open the URL printed in the terminal (usually `http://localhost:3000`).

Or open `visualizer/index.html` directly in a modern browser (file:// works for placement; a local static server is preferred so assets load reliably).

## Usage

1. Pick a view tab (Front, Rear, Hatch Open, Left, Right, 3/4).
2. **Drag** a FedSig SKU from the left list onto the vehicle, or **click** a SKU to place it at the default mount for the current view.
3. Select a placed light to move, rotate, scale, or delete it.
4. Toggle body color (White / Black) and department color scheme as needed.
5. PDF Sign-off opens the browser print dialog (stub for this milestone).

## Scale & placement notes

Catalog `w` values are percent of stage/vehicle width, tuned for Durango against compiled-app mounts:

- Allegiant 53" roof bar (`ALGT`) ≈ 48%
- MicroPulse grille (`MPS63`) ≈ 4.5%
- SpectraLux ILS visor (`SIFMJS`) ≈ 28%

Click-to-place defaults are **view-aware** (front/rear/hero/side) and include Durango `fixtureNudge` (+1% Y) from the Perplexity reference.

White/black **Front** plates (`durango_front.png`, `durango_front_black.png`) were rebuilt to close internal alpha holes in the fascia under the grille (jagged stage bleed). Studio guidance came from DHC-ICEv2 page-02 front photo; other views remain as previously synced. `compiled-app/` Front is left untouched as reference capital.

If you downloaded a zip of this branch earlier, **re-download** after this Front fix — a hard refresh is not enough for a local zip extract.

## Out of scope (this milestone)

- GitHub Pages deploy changes
- Live QuickBooks OAuth / quote import
- Multi-vehicle (PIU / Tahoe)
- Polished multi-page PDF export

## Asset provenance (reuse, not redesign)

- **Durango vehicle PNGs**: non-Front views match prior sync; **Front** white/black plates were hole-filled from DHC-ICEv2 page-02 (fascia alpha repair). Do not re-run blanket despill.
- **FedSig fx cutouts**: MicroPulse / ALGT / ILS / Dyna / stick sprites in `visualizer/fx/` are the editable source cutouts.
- **Round lightheads**: higher-res hard-alpha sprites reused from `compiled-app/fx/fx_round_*.png`.
- **Chrome tokens**: colors, 288px panels, 4:3 stage cradle, and density cues ported from `compiled-app/assets/index-CqPjqCI_.css` (`.dark`) into this file’s CSS.
- **Default mounts**: per-view x/y/rot mined from the compiled catalog (plus Durango `fixtureNudge` dy≈1%).
