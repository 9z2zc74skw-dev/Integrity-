# Integrity Upfitters — Fleet Lighting Coverage Visualizer

Interactive sales/quote visualizer for Integrity Upfitters. Lets department decision-makers see exactly what a vehicle build will look like — lighting placement, push bar, interior dash lights, rear hatch warning lights — before signing off on a quote.

## Repo layout

- `compiled-app/` — the latest fully working build (static, self-contained). Open `compiled-app/index.html` in a browser or deploy the folder as-is to any static host (Netlify, Vercel, GitHub Pages, S3, etc.). This is a compiled/minified Vite bundle — there is no separate editable source included here.
- `prototypes/` — earlier single-file HTML iterations. Each file is plain, readable HTML/CSS/JS in one document, which makes them a much better starting point if you want an AI coding assistant (or a human) to keep extending the tool, since the compiled app's bundled JS isn't practical to hand-edit.
- `docs/PROJECT-BRIEF.md` — full project brief: vehicle coverage (2025+ Ford PIU, Chevy Tahoe PPV, Dodge Durango Pursuit), feature list, current build state, and suggested next steps.

## Quick start

To view the current build locally:

```bash
cd compiled-app
python3 -m http.server 8080
# open http://localhost:8080
```

To continue development, start from `prototypes/piu-quote-visualizer.html` and `docs/PROJECT-BRIEF.md` as your spec.
