# PIU / Fleet Lighting Coverage Visualizer — Project Brief

Use this as the context brief to paste into a new Grok conversation so it can pick up development on this project.

## What it is
An interactive sales/quote visualizer for Integrity Upfitters, letting department decision-makers see exactly what their vehicle build will look like before signing off, instead of reading a line-item quote.

## Vehicle coverage
- 2025+ Ford Police Interceptor Utility (PIU) — primary model, 5 view angles (front, rear, rear-open/hatch, left, right, plus a hero/3-4 view)
- Chevy Tahoe PPV — same view set, plus a black/blacked-out trim variant
- Dodge Durango Pursuit — front, rear, rear-open, left, right, hero

## Core features
- Rendered vehicle artwork per angle per model (not real photos) as the base layer
- Drag-and-drop placement of Federal Signal SKU "nodes" (lightbars, sticks, interior dash lights, rear hatch warning lights) with suggested default mount positions per view
- Toggle controls for: push bar (on/off — off by default for Wagoner-style no-push-bar builds), interior dash lighting, rear hatch warning lights
- Effect/beam overlay assets (the `fx/` sprites — round, bar, stick, dyna, wide styles in multiple color combos: red, blue, red/blue, amber, white, smoke variants) layered under the SKU nodes to preview light coverage/beam pattern
- "Load Wagoner Build" preset — auto-places all components matching the real QuickBooks Wagoner PIU estimate (Estimate 1233) and switches the push bar off
- Real Federal Signal SKUs and pricing sourced from actual QuickBooks estimates, not placeholder data
- Export: per-view PNG snapshot of each angle, plus a 5-page PDF sign-off sheet with a department representative signature and date line for formal approval

## Current build state
**The shop tool is `visualizer/`.** Do not open `archive/compiled-app` or `archive/prototypes` as the app.

`visualizer/index.html` is the editable source of truth (Durango, Silverado PPV, F-150 PPV, FedSig SKU catalog, click maps, scheme sprites).

The older Vite bundle and PIU HTML experiments are parked under `archive/` so they cannot be mistaken for the live tool. They are reference capital only.

## Suggested next steps
1. Open `visualizer/` and `visualizer/TRAP-LOG.md`.
2. Do not merge a feature branch just to publish GitHub Pages. Pages deploys `visualizer/` from `main` / `master` only.
3. Live QuickBooks OAuth is not wired; Load SKUs imports a JSON/text list through the same click rules.
