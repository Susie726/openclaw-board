# openclaw-board

A premium minimal static dashboard for visualizing local OpenClaw usage with real data.

## Includes

- overview KPI cards
- daily conversation trend from local transcript history
- model usage / remaining quota from `openclaw status --json --usage`
- topic keywords from recent user messages
- profile tags inferred heuristically from local activity
- recent sessions with summaries inferred from transcript text
- automation ideas and usage pattern cards

## Files

- `index.html` — page structure
- `styles.css` — visual system
- `app.js` — rendering logic
- `sample-data.json` — generated dashboard data source
- `scripts/generate_sample_data.py` — no-deps generator
- `scripts/refresh_and_push.sh` — one-shot refresh + commit + push helper

## Data sources

The generator reads from:

- `openclaw sessions --json`
- `openclaw status --json --usage`
- local transcript files under `~/.openclaw/agents/*/sessions/*.jsonl`

It is defensive about plugin noise, missing usage windows, and missing transcript files.

## Refresh the dashboard

From the repo root:

```bash
python3 scripts/generate_sample_data.py
```

That regenerates `sample-data.json` in place.

## Weekly refresh + git push

Manual flow:

```bash
python3 scripts/generate_sample_data.py
git status
git add sample-data.json README.md app.js index.html scripts/
git commit -m "chore: refresh dashboard data"
git push
```

One-shot helper:

```bash
sh scripts/refresh_and_push.sh
```

If there is no diff, the helper exits cleanly without creating an empty commit.

## Publish on GitHub Pages

1. Push this repo to GitHub
2. Open **Settings → Pages**
3. Set source to **Deploy from branch**
4. Choose **main / root**
5. Save

Your site will be published at:

`https://<your-username>.github.io/<repo-name>/`
