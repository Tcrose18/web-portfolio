# NYSE Factor Radar

An interactive factor screening dashboard with model presets, adjustable weights, sector filters, and searchable rankings.

[Open dashboard](https://aiinnov8er.com/)

## Two-minute walkthrough

1. Search for `CBL` and inspect the matching company.
2. Clear the search, then select a sector.
3. Change the factor model and inspect its formula description.
4. Adjust weights, change the table sort, and toggle the theme.

The hosted app displayed a local demo feed during verification. Snapshot and fallback values are demonstration data, not a licensed real-time market feed.

## Local web preview

From this folder, run:

```sh
python3 server.py
```

Open the address printed by the server. The app supports a local data fallback when external quotes are unavailable. For the optional Node API, install dependencies with `npm ci` and run `npm run api:start`.

## Source map

- `app.js`: factor models, scoring, controls, and rendering.
- `real-data.js`: bundled snapshot.
- `index.html` and `styles.css`: dashboard structure and presentation.
- `api/`: quote service and local development server.
- `electron/`: desktop wrapper.

## Stack

JavaScript, HTML, CSS, Node.js, Python development server, and an optional Electron wrapper. Mobile wrappers are omitted from this portfolio selection.

## Data limits

Quote availability depends on upstream providers and may be delayed or blocked. Factor scores demonstrate the implemented model, not validated investment performance.
