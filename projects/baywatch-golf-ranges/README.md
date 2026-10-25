# Baywatch Golf Range Finder

A standalone visitor demo for comparing driving ranges by sample bay availability, distance, travel time, and amenities.

[Open demo](https://tcrose18.github.io/web-portfolio/baywatch/)

## Walkthrough

1. Choose **Available now** to hide the full sample range.
2. Select **Under 5 mi** to compare the two closest sample ranges.
3. Switch between list and schematic map views.
4. Search for a town, or try a non-matching query and choose **Clear filters**.

The preview uses fixed sample data, makes no availability API calls, and requests no location permission. Map positions illustrate layout rather than geographic accuracy. The original staff system and service implementation are private and excluded.

## Source

- `App.tsx`: visitor interface, filters, search, saved state, and map/list views.
- `style.css`: visitor interface styling and responsive layout.
- `main.tsx`: React entry point.
- `vite.config.mjs`: static build configuration.

## Local setup

Requires Node.js 22.13 or newer.

```sh
npm install
npm run build
python3 -m http.server 8000 --directory ../../docs
```

Visit `http://localhost:8000/baywatch/`. The build writes static files to `docs/baywatch/` at the repository root.

## Stack

React, TypeScript, Vite, HTML, and CSS. This public specimen demonstrates the visitor experience; it includes no private service credentials, administration routes, or stored records.
