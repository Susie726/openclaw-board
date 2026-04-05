# openclaw-board

A premium minimal static dashboard for visualizing how Susie uses OpenClaw.

## Includes

- overview KPI cards
- daily conversation trend
- model usage / remaining quota
- topic keywords
- profile tags inferred from conversations
- usage pattern cards
- recent sessions snapshot
- automation ideas

## Files

- `index.html` — page structure
- `styles.css` — visual system
- `app.js` — rendering logic
- `sample-data.json` — replaceable data source

## Publish on GitHub Pages

1. Push this repo to GitHub
2. Open **Settings → Pages**
3. Set source to **Deploy from branch**
4. Choose **main / root**
5. Save

Your site will be published at:

`https://<your-username>.github.io/<repo-name>/`

## Replace sample data

Edit `sample-data.json`.

Later you can generate it automatically from OpenClaw session exports, memory files, or a scheduled script.

## Future directions

- connect real conversation logs
- compute daily volume automatically
- extract keywords with an LLM
- sync model usage / remaining quota from real status data
- generate tags from recent conversations
