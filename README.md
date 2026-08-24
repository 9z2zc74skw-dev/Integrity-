# Integrity Upfitters — Lighting Visualizer

Internal tool to visualize Federal Signal lighting builds on fleet vehicles.

**Current milestone:** Durango-first visualizer in `visualizer/` (place / move / scale / rotate light nodes).

## Run the Durango visualizer locally

```bash
npx --yes serve visualizer
```

Or open `visualizer/index.html` in a browser. See `visualizer/README.md` for usage details.

## Layout

- `visualizer/` — **source of truth** for the Durango-first app (HTML + Durango PNGs + `fx/` sprites)
- `docs/PROJECT-BRIEF.md` — product context / handoff brief
- `prototypes/` — earlier editable HTML experiments
- `compiled-app/` — earlier Vite build (**reference only** — do not edit as source)

## Scope notes

This milestone is Durango-only. Multi-vehicle, live QB OAuth, GitHub Pages, and polished PDF sign-off are out of scope.
