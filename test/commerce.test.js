import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { resolveCart, checkoutParams, verifyStripeEvent, orderFromSession, canDownload } from '../lib/commerce.js';

const products = [
  { id: 'a', title: 'A', price: 1200 },
  { id: 'b', title: 'B', price: 900 },
  { id: 'soon', title: 'Soon', price: 0, status: 'coming-soon' },
];

test('resolveCart dedupes and rejects unknown or unreleased products', () => {
  assert.deepEqual(resolveCart(['a', 'a', 'b'], products).map((p) => p.id), ['a', 'b']);
  assert.equal(resolveCart(['a', 'nope'], products), null);
  assert.equal(resolveCart(['soon'], products), null);
  assert.equal(resolveCart([], products), null);
  assert.equal(resolveCart('a', products), null);
});

test('checkoutParams uses server prices', () => {
  const p = checkoutParams([products[0]], 'usd', 'https://x.test');
  assert.equal(p.get('line_items[0][price_data][unit_amount]'), '1200');
  assert.equal(p.get('metadata[product_ids]'), 'a');
  assert.equal(p.get('success_url'), 'https://x.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
});

test('verifyStripeEvent accepts valid signatures only', () => {
  const secret = 'whsec_test';
  const raw = Buffer.from(JSON.stringify({ type: 'checkout.session.completed' }));
  const t = 1_700_000_000;
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  assert.equal(verifyStripeEvent(raw, `t=${t},v1=${sig}`, secret, t).type, 'checkout.session.completed');
  assert.equal(verifyStripeEvent(raw, `t=${t},v1=${sig.replace(/.$/, '0')}`, secret, t), null);
  assert.equal(verifyStripeEvent(raw, `t=${t},v1=${sig}`, 'other', t), null);
  assert.equal(verifyStripeEvent(raw, `t=${t},v1=${sig}`, secret, t + 3600), null); // replay window
  assert.equal(verifyStripeEvent(raw, undefined, secret, t), null);
});

test('canDownload enforces ownership, expiry and limits', () => {
  const order = orderFromSession({ id: 'cs_1', metadata: { product_ids: 'a,b' }, amount_total: 2100, currency: 'usd' });
  const rules = { days: 30, maxPerFile: 2 };
  assert.equal(canDownload(order, 'a', rules), 'ok');
  assert.equal(canDownload(order, 'c', rules), 'not-found');
  assert.equal(canDownload(undefined, 'a', rules), 'not-found');
  assert.equal(canDownload(order, 'a', rules, order.createdAt + 31 * 864e5), 'expired');
  order.downloads.a = 2;
  assert.equal(canDownload(order, 'a', rules), 'limit');
});
