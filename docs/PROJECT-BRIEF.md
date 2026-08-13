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
The most recent working version is a bundled/compiled web app (Vite build output — `index.html` + hashed JS/CSS bundles + all vehicle and fx PNG assets, ~43MB total, 67 files). This bundle is fully self-contained and can be hosted on any static web host or opened locally, but it is minified/compiled — there is no separate editable source (no `src/`, no component files, no `package.json`) included in this handoff. If you want an AI coding assistant to keep extending it (new models, new package types, new view angles), the practical path is to treat this brief as the spec and have it rebuilt from scratch in whatever stack that assistant works in, rather than trying to edit the compiled bundle directly.

Earlier, more editable prototype iterations also exist as single-file HTML documents (self-contained HTML/CSS/JS, easy to paste into a coding assistant and iterate on directly): `piu-quote-visualizer.html`, `piu-layer-viewer.html`, `piu-layer-viewer-fixed.html`, `piu-layer-viewer-working.html`. These predate the Tahoe/Durango expansion and the final PDF sign-off sheet feature, but they're a better starting point for further AI-assisted editing since they're plain readable code.

## Suggested next steps to hand to Grok
1. Share this brief plus one of the single-file HTML prototypes as a starting point.
2. Ask Grok to bring the prototype up to feature parity with the compiled build described above (Tahoe + Durango support, fx overlay layering, Wagoner preset, 5-page PDF sign-off export).
3. From there, continue whatever new features you want (additional vehicle models, package types, etc.) directly in that environment.
