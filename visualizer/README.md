# Lighting Visualizer

**This folder is the shop tool.** Open it. Do not open `archive/compiled-app`, `archive/GitHub-Upload-Small`, or `archive/prototypes`.

Interactive sales/quote visualizer for Integrity Upfitters:

- 2024 Dodge Durango Pursuit
- Chevrolet Silverado PPV
- Ford F-150 PPV

## Run locally

From the repo root:

```bash
npx --yes serve visualizer
```

Then open the URL printed in the terminal (usually `http://localhost:3000`).

Or open `index.html` from a static server so `quotes/` and `fx/` load.

A hard refresh starts on a **bare** plate (zero placements, overlay toggles off). Lights appear only after a Parts click, a user-flipped toggle, or Load SKUs. Clear All / Clear View do not re-seed.

## Usage

1. Pick a vehicle, then a view tab.
2. **Drag** a FedSig SKU onto the vehicle, or **click** a SKU to place it on its click-map mounts.
3. Select a placed light to move, rotate, scale, or delete it.
4. Body color is White / Black. Color scheme is Red/Blue, Blue/White, Red/White, R/B/W — each loads real sprites.
5. **Load SKUs** imports a `.json` / `.txt` / `.csv` list, or type `1236` / `demo-1236` to load `quotes/demo-1236.json`. Placement uses the same click rules as a manual click. Live QuickBooks is not connected.
6. **Print** opens the browser print dialog (current view). It is not a multi-page sign-off PDF.

## Roof bar

One type: `ALGT53JX-P3LB`. Stored on Front only. Left / Right / Rear / 3/4 draw a ghost from that Front node. Off-front ALGT nodes are purged on load.

## Toggles

- **Interior Dash** places or removes `SIFMJS` (visor ILS — two shrouds with a mirror gap). Not a second overlay.
- **Rear Hatch Lights** places or removes `STICK-RB`. Not a decoration overlay.
- **Push Bar** is a measured per-vehicle overlay on Front (and Durango 3/4).

## Pages

GitHub Pages, when enabled, publishes this `visualizer/` folder from `main` / `master`. This feature branch does not publish a live shop URL.

## Trap log

See `TRAP-LOG.md` in this folder.
