# Integrity Upfitters — Fleet Lighting Coverage Visualizer

Interactive sales/quote visualizer for Integrity Upfitters. Internal tool to translate QuickBooks quotes into a visual build; the PDF is what the customer sees.

## Live app (GitHub Pages)

After the first Actions deploy:

**https://9z2zc74skw-dev.github.io/Integrity-/**

(or `…/Integrity-/visualizer/` depending on Pages settings)

## Repo layout

- `visualizer/` — **current rebuild** (Durango-first, editable). This is what GitHub Actions deploys.
- `compiled-app/` — earlier compiled Perplexity build (reference only).
- `prototypes/` — older single-file HTML experiments.
- `docs/PROJECT-BRIEF.md` — project brief and feature list.

## Auto-deploy

Push to `main` (changes under `visualizer/`) → GitHub Actions → GitHub Pages.

Workflow: `.github/workflows/deploy-pages.yml`

### One-time GitHub setup

1. Repo **Settings → Pages**
2. **Source:** GitHub Actions
3. Push this repo (or run the workflow manually under the **Actions** tab)
4. Wait ~1 minute; open the Pages URL

## Local preview

```bash
cd visualizer
python3 -m http.server 8080
# open http://localhost:8080
```

## Vehicles (planned)

- Dodge Durango Pursuit (priority)
- Ford PIU
- Chevy Tahoe PPV
- 2026 Ram 1500 PPV
- Chevy Silverado PPV
