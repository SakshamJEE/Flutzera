// Static export for GitHub Pages: renders every page to dist/.
// Pages has no server, so checkout, downloads, contact and newsletter are not available there.
// Usage: BASE_PATH=/Flutzera SITE_URL=https://sakshamjee.github.io/Flutzera node build.js
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import * as views from './lib/views.js';

const ROOT = import.meta.dirname;
const OUT = join(ROOT, 'dist');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL || `http://localhost${BASE_PATH}`).replace(/\/$/, '');

const read = async (f) => JSON.parse(await readFile(join(ROOT, 'content', f), 'utf8'));
const [site, products, projects] = await Promise.all([read('site.json'), read('products.json'), read('projects.json')]);
const ctxFor = (path) => ({ site, products, projects, base: SITE_URL, basePath: BASE_PATH, path });

// Root-relative links ("/shop") must live under the project subpath on Pages ("/Flutzera/shop").
const rebase = (html) => html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${BASE_PATH}/`);

const pages = {
  '/': (c) => views.home(c),
  '/portfolio': (c) => views.portfolio(c),
  '/shop': (c) => views.shop(c, null),
  '/about': (c) => views.about(c),
  '/contact': (c) => views.contact(c),
  '/cart': (c) => views.cart(c),
  ...Object.fromEntries(projects.map((p) => [`/portfolio/${p.slug}`, (c) => views.project(c, p)])),
  ...Object.fromEntries(products.map((p) => [`/shop/${p.slug}`, (c) => views.product(c, p)])),
};

await rm(OUT, { recursive: true, force: true });
for (const [path, render] of Object.entries(pages)) {
  const file = join(OUT, path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, rebase(render(ctxFor(path))));
}
await writeFile(join(OUT, '404.html'), rebase(views.notFound(ctxFor('/404'))));
await writeFile(join(OUT, 'sitemap.xml'), views.sitemap(ctxFor('/')));
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await writeFile(join(OUT, '.nojekyll'), '');
await cp(join(ROOT, 'public'), join(OUT, 'assets'), { recursive: true });

console.log(`Built ${Object.keys(pages).length} pages to dist/ (base path "${BASE_PATH || '/'}")`);
