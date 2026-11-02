import http from 'node:http';
import { readFile, writeFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, extname, basename, resolve, sep } from 'node:path';
import * as views from './lib/views.js';
import { resolveCart, checkoutParams, verifyStripeEvent, orderFromSession, canDownload } from './lib/commerce.js';

const ROOT = import.meta.dirname;
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, 'data');
const ORDERS = join(DATA, 'orders.json');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

// Content is re-read per request so edits to content/*.json show up without a restart.
async function loadContent() {
  const read = async (f) => JSON.parse(await readFile(join(ROOT, 'content', f), 'utf8'));
  const [site, products, projects] = await Promise.all([read('site.json'), read('products.json'), read('projects.json')]);
  return { site, products, projects, base: BASE_URL };
}

// shortcut: orders live in one JSON file with writes serialised in-process; move to a database before running more than one server instance.
let ordersLock = Promise.resolve();
const readOrders = () => readFile(ORDERS, 'utf8').then(JSON.parse, () => []);
function updateOrders(fn) {
  ordersLock = ordersLock.then(async () => {
    const orders = await readOrders();
    const result = fn(orders);
    await mkdir(DATA, { recursive: true });
    await writeFile(ORDERS, JSON.stringify(orders, null, 2));
    return result;
  });
  return ordersLock;
}

async function appendRecord(file, record) {
  await mkdir(DATA, { recursive: true });
  await appendFile(join(DATA, file), JSON.stringify({ ...record, at: new Date().toISOString() }) + '\n');
}

function readBody(req, limit = 1e6) {
  return new Promise((ok, fail) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { fail(Object.assign(new Error('Payload too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

function parseFields(req, raw) {
  const text = raw.toString('utf8');
  if ((req.headers['content-type'] || '').includes('application/json')) return JSON.parse(text || '{}');
  return Object.fromEntries(new URLSearchParams(text));
}

const send = (res, status, body, type = 'text/html; charset=utf-8', headers = {}) => {
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(body);
};
const json = (res, status, data) => send(res, status, JSON.stringify(data), 'application/json');
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };

async function serveStatic(res, path) {
  const file = resolve(PUBLIC, '.' + path);
  if (!file.startsWith(PUBLIC + sep)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
  } catch { return false; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
  createReadStream(file).pipe(res);
  return true;
}

// ---- API handlers ---------------------------------------------------------

async function apiCheckout(req, res, ctx) {
  const { items } = parseFields(req, await readBody(req));
  const cart = resolveCart(items, ctx.products);
  if (!cart) return json(res, 400, { error: 'Your cart contains an item that is no longer available. Please refresh and try again.' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(res, 503, { error: 'Checkout is not open yet — payments have not been configured. No charge was made.' });

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: checkoutParams(cart, ctx.site.currency, BASE_URL),
  });
  const session = await r.json();
  if (!r.ok) {
    console.error('Stripe checkout error:', session.error?.message);
    return json(res, 502, { error: 'The payment provider could not start checkout. No charge was made. Please try again shortly.' });
  }
  json(res, 200, { url: session.url });
}

async function apiStripeWebhook(req, res) {
  const raw = await readBody(req);
  const event = verifyStripeEvent(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  if (!event) return json(res, 400, { error: 'Invalid signature' });

  const session = event.data?.object;
  const paid = (event.type === 'checkout.session.completed' && session.payment_status === 'paid') || event.type === 'checkout.session.async_payment_succeeded';
  if (paid) {
    await updateOrders((orders) => {
      if (!orders.some((o) => o.sessionId === session.id)) orders.push(orderFromSession(session));
    });
    // Hook for emailing download links (Postmark, Resend, SES...). The success page already shows them.
    console.log(`Order paid: ${session.id} (${session.customer_details?.email ?? 'no email'})`);
  }
  json(res, 200, { received: true });
}

async function apiContact(req, res, wantsJson) {
  const f = parseFields(req, await readBody(req, 1e5));
  if (f.website) return wantsJson ? json(res, 200, { ok: true }) : redirect(res, '/thanks?form=contact'); // honeypot
  const name = String(f.name || '').trim();
  const email = String(f.email || '').trim();
  const message = String(f.message || '').trim();
  const topic = ['general', 'business', 'collaboration', 'order'].includes(f.topic) ? f.topic : 'general';
  if (!name || name.length > 120 || !EMAIL_RE.test(email) || email.length > 200 || !message || message.length > 5000) {
    return json(res, 422, { error: 'Please add your name, a valid email and a message (up to 5000 characters).' });
  }
  await appendRecord('messages.jsonl', { name, email, topic, message });
  wantsJson ? json(res, 200, { ok: true }) : redirect(res, '/thanks?form=contact');
}

async function apiSubscribe(req, res, wantsJson) {
  const email = String(parseFields(req, await readBody(req, 1e4)).email || '').trim();
  if (!EMAIL_RE.test(email) || email.length > 200) return json(res, 422, { error: 'Please enter a valid email address.' });

  const key = process.env.BUTTONDOWN_API_KEY;
  if (key) {
    const r = await fetch('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email }),
    });
    // 400 from Buttondown usually means "already subscribed", which is fine to treat as success.
    if (!r.ok && r.status !== 400) return json(res, 502, { error: 'Sign-up failed. Please try again later.' });
  } else {
    await appendRecord('subscribers.jsonl', { email });
  }
  wantsJson ? json(res, 200, { ok: true }) : redirect(res, '/thanks?form=newsletter');
}

async function download(res, ctx, token, productId) {
  const order = (await readOrders()).find((o) => o.token === token);
  const verdict = canDownload(order, productId, ctx.site.download);
  const product = ctx.products.find((p) => p.id === productId);
  if (verdict !== 'ok' || !product?.file) return send(res, verdict === 'not-found' ? 404 : 410, views.downloadError(ctx, verdict));

  const file = join(ROOT, 'private', 'downloads', basename(product.file));
  try { await stat(file); } catch {
    console.error(`Missing product file: ${file}`);
    return send(res, 500, views.downloadError(ctx, 'missing'));
  }
  await updateOrders((orders) => {
    const o = orders.find((x) => x.token === token);
    o.downloads[productId] = (o.downloads[productId] ?? 0) + 1;
  });
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${basename(product.file)}"`, 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

// ---- Router ---------------------------------------------------------------

async function handle(req, res) {
  const url = new URL(req.url, BASE_URL);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const wantsJson = (req.headers.accept || '').includes('application/json');

  if (path.startsWith('/assets/') && req.method === 'GET') {
    if (await serveStatic(res, path.slice('/assets'.length))) return;
  }

  const ctx = { ...(await loadContent()), path };

  if (req.method === 'POST') {
    if (path === '/api/checkout') return apiCheckout(req, res, ctx);
    if (path === '/api/stripe-webhook') return apiStripeWebhook(req, res);
    if (path === '/api/contact') return apiContact(req, res, wantsJson);
    if (path === '/api/subscribe') return apiSubscribe(req, res, wantsJson);
    return json(res, 404, { error: 'Not found' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');

  let m;
  if (path === '/') return send(res, 200, views.home(ctx));
  if (path === '/portfolio') return send(res, 200, views.portfolio(ctx));
  if ((m = path.match(/^\/portfolio\/([\w-]+)$/))) {
    const project = ctx.projects.find((p) => p.slug === m[1]);
    if (project) return send(res, 200, views.project(ctx, project));
  }
  if (path === '/shop') return send(res, 200, views.shop(ctx, url.searchParams.get('category')));
  if ((m = path.match(/^\/shop\/([\w-]+)$/))) {
    const product = ctx.products.find((p) => p.slug === m[1]);
    if (product) return send(res, 200, views.product(ctx, product));
  }
  if (path === '/about') return send(res, 200, views.about(ctx));
  if (path === '/contact') return send(res, 200, views.contact(ctx));
  if (path === '/cart') return send(res, 200, views.cart(ctx));
  if (path === '/thanks') return send(res, 200, views.thanks(ctx, url.searchParams.get('form')));
  if (path === '/checkout/success') {
    const sid = url.searchParams.get('session_id');
    const order = sid ? (await readOrders()).find((o) => o.sessionId === sid) : null;
    return send(res, 200, views.success(ctx, order), undefined, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  }
  if ((m = path.match(/^\/download\/([\w-]+)\/([\w-]+)$/))) return download(res, ctx, m[1], m[2]);
  if (path === '/robots.txt') return send(res, 200, `User-agent: *\nDisallow: /download/\nDisallow: /checkout/\nSitemap: ${BASE_URL}/sitemap.xml\n`, 'text/plain');
  if (path === '/sitemap.xml') return send(res, 200, views.sitemap(ctx), 'application/xml');

  send(res, 404, views.notFound(ctx));
}

http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  handle(req, res).catch((err) => {
    console.error(err);
    if (res.headersSent) return res.end();
    const status = err.status || (err instanceof SyntaxError ? 400 : 500);
    json(res, status, { error: status === 500 ? 'Something went wrong.' : err.message });
  });
}).listen(PORT, () => console.log(`Flutzera running at ${BASE_URL}`));
