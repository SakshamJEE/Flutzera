import crypto from 'node:crypto';

// Resolve cart ids against the catalogue. Prices always come from the server, never the client.
export function resolveCart(ids, products) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) return null;
  const items = [...new Set(ids)].map((id) => products.find((p) => p.id === id && p.status !== 'coming-soon'));
  return items.every(Boolean) ? items : null;
}

// Form-encoded body for POST https://api.stripe.com/v1/checkout/sessions
export function checkoutParams(items, currency, baseUrl) {
  const p = new URLSearchParams({
    mode: 'payment',
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`,
    'metadata[product_ids]': items.map((i) => i.id).join(','),
  });
  items.forEach((item, n) => {
    p.set(`line_items[${n}][quantity]`, '1');
    p.set(`line_items[${n}][price_data][currency]`, currency);
    p.set(`line_items[${n}][price_data][unit_amount]`, String(item.price));
    p.set(`line_items[${n}][price_data][product_data][name]`, item.title);
  });
  return p;
}

// Verifies the Stripe-Signature header (scheme v1) and returns the parsed event, or null.
export function verifyStripeEvent(raw, header, secret, now = Date.now() / 1000, tolerance = 300) {
  if (!header || !secret) return null;
  let t;
  const sigs = [];
  for (const pair of header.split(',')) {
    const [k, v] = pair.split('=');
    if (k === 't') t = Number(v);
    if (k === 'v1') sigs.push(v);
  }
  if (!t || Math.abs(now - t) > tolerance) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.`).update(raw).digest('hex');
  const ok = sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  return ok ? JSON.parse(raw.toString('utf8')) : null;
}

export function orderFromSession(session) {
  return {
    sessionId: session.id,
    token: crypto.randomBytes(24).toString('base64url'),
    email: session.customer_details?.email ?? null,
    productIds: (session.metadata?.product_ids ?? '').split(',').filter(Boolean),
    amount: session.amount_total,
    currency: session.currency,
    createdAt: Date.now(),
    downloads: {},
  };
}

export function canDownload(order, productId, { days, maxPerFile }, now = Date.now()) {
  if (!order || !order.productIds.includes(productId)) return 'not-found';
  if (now - order.createdAt > days * 864e5) return 'expired';
  if ((order.downloads[productId] ?? 0) >= maxPerFile) return 'limit';
  return 'ok';
}
