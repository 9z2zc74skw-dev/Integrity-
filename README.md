# Integrity Upfitters — Lighting Visualizer

**Open `visualizer/`.** That folder is the only shop tool in this repository.

Do not open `archive/`. Parked trees (`compiled-app`, `GitHub-Upload-Small`, `prototypes`) are not the visualizer and must not be hosted or demoed as the live app.

Internal tool to place Federal Signal lighting SKUs on fleet vehicles (Durango Pursuit, Silverado PPV, F-150 PPV).

## Run locally

```bash
npx --yes serve visualizer
```

Or open `visualizer/index.html` from a static server. See `visualizer/README.md`.

## Layout

- `visualizer/` — **source of truth** (HTML + vehicle plates + `fx/` sprites + quote import samples)
- `visualizer/TRAP-LOG.md` — named self-test traps from this pass
- `docs/PROJECT-BRIEF.md` — older product context (the live app is still `visualizer/`)
- `archive/` — parked leftovers. Not the shop tool.

## What this tool does

- Click or drag catalog SKUs onto the current vehicle. One click map per vehicle.
- One roof-bar type (`ALGT53JX-P3LB`), stored on Front only. Side / rear / 3/4 show ghosts.
- Color schemes Red/Blue, Blue/White, Red/White, and R/B/W swap real sprites.
- **Load SKUs** imports a JSON/text SKU list (or quote `1236` / `demo-1236` from `visualizer/quotes/demo-1236.json`) and places through the same click rules. Live QuickBooks is not wired.
- **Print** opens the browser print dialog. It is not a multi-page PDF sign-off sheet.

## GitHub Pages

The workflow deploys `visualizer/` from `main` / `master` (or a manual Actions run). This feature branch is not Pages and is not merged for hosting. There is no promised live shop URL on this branch.
