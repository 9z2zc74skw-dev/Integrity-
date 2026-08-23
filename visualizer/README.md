# Durango Lighting Visualizer

Interactive sales/quote visualizer for **Dodge Durango Pursuit** lighting builds (Integrity Upfitters).

This folder is the editable source of truth for the Durango milestone. Do **not** edit `compiled-app/` as source — that Vite bundle is reference-only.

## Run locally

From the repo root:

```bash
npx --yes serve visualizer
```

Then open the URL printed in the terminal (usually `http://localhost:3000`).

Or open `visualizer/index.html` directly in a modern browser (file:// works for placement; a local static server is preferred so assets load reliably).

## Usage

1. Pick a view tab (Front, Rear, Hatch Open, Left, Right, 3/4).
2. **Drag** a FedSig SKU from the left list onto the vehicle, or **click** a SKU to place it at the default mount.
3. Select a placed light to move, rotate, scale, or delete it.
4. Toggle body color (White / Black) and department color scheme as needed.
5. PDF Sign-off opens the browser print dialog (stub for this milestone).

## Scale notes

Catalog `w` values are percent of stage/vehicle width, tuned for Durango:

- Allegiant 53" roof bar (`ALGT`) ≈ 48% (target ~46–58% of roof width)
- MicroPulse grille (`MPS63`) ≈ 4% (target ~3.5–5%)
- SpectraLux ILS visor (`SIFMJS`) ≈ 24%

## Out of scope (this milestone)

- GitHub Pages deploy changes
- Live QuickBooks OAuth / quote import
- Multi-vehicle (PIU / Tahoe)
- Polished multi-page PDF export
