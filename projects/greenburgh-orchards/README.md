# Greenburgh Orchards

An editorial storefront for a small clothing collection, with product discovery, size selection, a shopping basket, and an order reservation flow.

[Open storefront](https://greenburgh-orchards.kremlindog.chatgpt.site/)

## Two-minute walkthrough

1. Explore the collection or design studies.
2. Open the Verger Neigeux Tee and select a size.
3. Add the item to the basket and inspect the subtotal.
4. Continue to checkout to review the form and order summary.

Stop before placing an order or subscribing: those actions write to the hosted application. Payment is arranged separately, and preview-only products are labeled as design previews.

## Source map

- `app/Storefront.tsx`: shared storefront, navigation, product dialogs, and basket.
- `app/products.ts`: product definitions.
- `app/checkout/`: checkout interface and validation.
- `app/api/orders/route.ts`: order normalization and persistence.
- `app/shop.css`: storefront presentation and responsive layouts.
- `public/`: project artwork and product images.

## Stack

React, TypeScript, Vinext/Next.js routing, Cloudflare Workers, Drizzle, D1, and R2.

## Local setup

Requires Node.js 22.13 or newer. From this project directory:

```sh
npm ci
npm run dev
```

Build with `npm run build`. The sanitized `.openai/hosting.json` declares local database/storage binding names without linking this copy to a hosted project. Persistent service data and runtime secrets are not included.

## Service configuration

Order and subscription endpoints require initialized D1 tables. Moodboard storage also uses R2. This public source includes schemas and migrations, not customer records or uploaded private content.
