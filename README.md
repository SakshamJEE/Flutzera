# Flutzera — portfolio + digital shop

A personal brand website with a portfolio and a digital product store, in a botanical biomorphic style.
Server-rendered Node.js with **zero dependencies** (Node 22.9+).

```bash
npm start        # http://localhost:3000
npm run dev      # restarts on code changes
npm test         # commerce logic tests
```

## Pages

`/` home · `/portfolio` and `/portfolio/:slug` · `/shop` (filter, search, sort) and `/shop/:slug` · `/about` · `/contact` · `/cart` · `/checkout/success` · `/sitemap.xml` · `/robots.txt`

## Managing content

All content is JSON in `content/`, re-read on each request, so edits show up without a restart.

- `site.json`: brand name, emails, socials, currency, categories, download rules.
- `products.json`: one object per product. `price` is in cents. `tone` picks the cover colour (`forest`, `sage`, `beige`, `olive`, `charcoal`). `status: "coming-soon"` shows the product without a buy button. `file` is the filename in `private/downloads/`.
- `projects.json`: one object per portfolio project. `variant` (0–3) picks the illustration, `tone` the colour.

`private/downloads/` holds the product files. The files there now are **placeholders**: replace each one with the real archive, keeping the filename. This folder is never served directly.

## Payments and delivery (Stripe)

Checkout stays closed until Stripe is configured. Without keys, the cart shows "Checkout is not open yet" and nothing is charged.

1. Copy `.env.example` to `.env`. Set `BASE_URL` to your public URL.
2. Set `STRIPE_SECRET_KEY` (use `sk_test_...` first).
3. In Stripe, add a webhook endpoint `https://your-domain/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe-webhook`.

Flow:

1. The cart sends product ids to `POST /api/checkout`. The server looks up prices in `products.json` and creates a Stripe Checkout Session.
2. The customer pays on Stripe's hosted page.
3. Stripe calls the webhook. The server verifies the signature, then records the order in `data/orders.json` with a random download token.
4. `/checkout/success` shows "Confirming payment" until the webhook arrives, then shows the download links.
5. `/download/:token/:productId` streams the file. Links expire after `download.days` and allow `download.maxPerFile` downloads per file (see `site.json`).

No order exists and no download is offered until Stripe confirms payment.

To also email links to buyers, call an email provider (Postmark, Resend, SES) where the webhook handler in `server.js` logs `Order paid`.

## Contact form and newsletter

- Contact messages are appended to `data/messages.jsonl`.
- Newsletter: set `BUTTONDOWN_API_KEY` to send sign-ups to Buttondown. Without it, sign-ups go to `data/subscribers.jsonl`.
- Both forms also work without JavaScript.

## Deploying

Any host that runs Node works (Render, Railway, Fly.io, a VPS). `data/` must be on persistent storage.
The order store is a single JSON file, so run **one** server instance. Move orders to a database before scaling out.
