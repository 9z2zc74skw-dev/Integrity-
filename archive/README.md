# Archive — not the shop tool

**The working lighting visualizer is `visualizer/` at the repo root.**

Nothing in this folder is the Integrity Upfitters shop tool. Do not open these apps, do not host them, and do not treat them as the live preview.

| Parked path | What it was | Why it is here |
|---|---|---|
| `compiled-app/` | Earlier Vite/Perplexity bundle | Reference capital only. Multi-page PDF ideas live here; Vector does not run this build. |
| `GitHub-Upload-Small/` | Stale upload bundle that advertised a GitHub Pages URL | That Pages URL is not this tool. The bundle is parked so a stranger cannot mistake it for the shop app. |
| `prototypes/` | Early single-file PIU experiments | Out of the live tree so they cannot be opened as the current visualizer. |

Open:

```bash
npx --yes serve visualizer
```

GitHub Pages, when enabled, deploys `visualizer/` from `main` / `master` only. This feature branch is not Pages. Do not treat `https://9z2zc74skw-dev.github.io/Integrity-/` as the live shop tool.
