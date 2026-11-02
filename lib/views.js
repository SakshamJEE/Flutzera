// Server-rendered page templates. Every value from content/*.json goes through esc().

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (cents, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
const isSoon = (p) => p.status === 'coming-soon';
const priceLabel = (p, site) => (isSoon(p) ? 'Coming soon' : money(p.price, site.currency));
const catLabel = (site, id) => site.productCategories.find((c) => c.id === id)?.label ?? id;
const ASSET_V = Date.now().toString(36); // busts the 1h asset cache on each deploy/restart
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

// ---- Botanical art --------------------------------------------------------

const BLOBS = [
  'M44.6,-58.1C57.3,-49.3,66.5,-34.9,70.6,-19C74.7,-2.9,73.6,14.7,66.1,28.9C58.6,43.2,44.7,54.1,29.2,61.6C13.7,69.2,-3.4,73.5,-19.8,70.1C-36.2,66.8,-51.9,55.8,-62.2,40.9C-72.4,26,-77.2,7.3,-73.8,-9.6C-70.4,-26.5,-58.7,-41.6,-44.2,-50.2C-29.7,-58.8,-14.9,-61,1,-62.3C16.9,-63.6,33.7,-63.9,44.6,-58.1Z',
  'M38.9,-47.6C50.4,-37.5,59.4,-24.6,63.2,-9.6C67,5.4,65.7,22.5,57.1,35C48.5,47.5,32.6,55.4,15.6,61.4C-1.4,67.4,-19.5,71.5,-33.6,65.1C-47.7,58.7,-57.8,41.8,-63.5,24.3C-69.2,6.8,-70.5,-11.3,-63.7,-25.6C-56.9,-39.9,-42,-50.4,-27.4,-59.6C-12.8,-68.8,1.5,-76.7,14.6,-73.6C27.7,-70.5,27.4,-57.7,38.9,-47.6Z',
  'M52.2,-61.4C66.1,-50.1,74.7,-32.3,75.9,-14.6C77.1,3.2,70.8,20.9,60.6,35.3C50.4,49.7,36.2,60.9,19.5,67.7C2.8,74.5,-16.4,76.9,-31.7,70C-47,63.1,-58.4,46.9,-65.6,29.4C-72.8,11.9,-75.8,-6.9,-69.8,-22.3C-63.8,-37.7,-48.8,-49.7,-33.5,-60.6C-18.2,-71.5,-2.6,-81.3,12.9,-80.1C28.4,-78.9,38.3,-72.7,52.2,-61.4Z',
];
const LEAF = 'M0,0 C-17,-20 -19,-56 0,-82 C19,-56 17,-20 0,0Z';
const leaf = (x, y, rot, s, fill = 'var(--a1)', vein = true) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="${LEAF}" fill="${fill}"/>${vein ? '<path d="M0,-2 L0,-74" stroke="var(--bg)" stroke-width="1.4" opacity=".55"/>' : ''}</g>`;
const blob = (i, x, y, s, fill, cls = '') => `<g transform="translate(${x} ${y}) scale(${s})"><path class="${cls}" d="${BLOBS[i % BLOBS.length]}" fill="${fill}"/></g>`;

// Four abstract compositions; tone classes set the --bg/--a1/--a2/--line colours.
const ART = [
  () => `${blob(0, 210, 150, 1.6, 'var(--a2)', 'drift')}${blob(1, 140, 190, 0.7, 'var(--a1)', 'drift drift--slow')}<g class="sway" style="transform-origin:240px 260px">${leaf(240, 260, -18, 1.25)}${leaf(250, 252, 30, 0.85, 'var(--line)', false)}</g>`,
  () => `<g fill="none" stroke="var(--line)" stroke-width="1.5">${[150, 120, 90, 60].map((r) => `<path d="M${200 - r} 300 V180 a${r} ${r} 0 0 1 ${2 * r} 0 V300"/>`).join('')}</g><circle class="drift" cx="300" cy="80" r="34" fill="var(--a1)"/>${blob(2, 110, 90, 0.5, 'var(--a2)', 'drift drift--slow')}`,
  () => `<g class="sway" style="transform-origin:120px 300px"><path d="M120 300 C140 230 190 170 290 40" fill="none" stroke="var(--line)" stroke-width="2"/>${leaf(146, 236, -40, 0.75)}${leaf(160, 214, 55, 0.7)}${leaf(196, 172, -30, 0.7)}${leaf(212, 150, 65, 0.62)}${leaf(250, 98, -20, 0.6)}${leaf(262, 86, 70, 0.5)}${leaf(290, 40, 30, 0.45)}</g>${blob(1, 320, 240, 0.9, 'var(--a2)', 'drift')}`,
  () => `${[[150, 160, 70], [230, 140, 52], [280, 200, 30], [110, 90, 22]].map(([cx, cy, r], i) => `<circle class="drift${i % 2 ? ' drift--slow' : ''}" cx="${cx}" cy="${cy}" r="${r}" fill="${i % 2 ? 'var(--a1)' : 'var(--a2)'}"/>`).join('')}<path d="M40 250 C140 210 260 290 370 230" fill="none" stroke="var(--line)" stroke-width="1.5"/>`,
];
export const art = (tone, variant = 0, cls = '') =>
  `<div class="art tone-${esc(tone)} ${cls}" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${ART[variant % ART.length]()}</svg></div>`;

const cover = (p, site) =>
  `<div class="cover cover--${esc(p.category)} tone-${esc(p.tone)}" aria-hidden="true">
    <svg class="cover__art" viewBox="0 0 200 260" preserveAspectRatio="xMidYMax slice">${blob(p.title.length, 150, 210, 1.15, 'var(--a2)', 'drift')}${leaf(150, 250, -12 + (p.title.length % 5) * 6, 1.25)}</svg>
    <span class="cover__kicker">${esc(catLabel(site, p.category))}</span>
    <span class="cover__title">${esc(p.title)}</span>
    <span class="cover__mark">${esc(site.name)}</span>
  </div>`;

const heroArt = () => `
<svg class="hero-art" viewBox="0 0 520 600" role="img" aria-label="Abstract botanical illustration: an arch with a growing stem and soft organic shapes">
  ${blob(0, 210, 250, 2.9, 'var(--sage)', 'drift')}
  ${blob(1, 380, 470, 1.7, 'var(--beige)', 'drift drift--slow')}
  <path d="M150 560 V310 a120 120 0 0 1 240 0 V560Z" fill="var(--forest)"/>
  <circle cx="420" cy="110" r="46" fill="none" stroke="var(--charcoal)" stroke-width="1.2"/>
  <circle class="drift" cx="110" cy="470" r="12" fill="var(--olive)"/>
  <circle class="drift drift--slow" cx="455" cy="300" r="7" fill="var(--olive)"/>
  <g class="sway" style="transform-origin:270px 560px; --bg: var(--forest)">
    <path d="M270 560 C262 470 290 380 276 290 S300 170 292 100" fill="none" stroke="var(--sage)" stroke-width="3" stroke-linecap="round"/>
    ${leaf(267, 480, -58, 0.95, 'var(--sage)')}${leaf(272, 450, 52, 0.85, 'var(--ivory)')}${leaf(281, 370, -62, 0.9, 'var(--sage)')}
    ${leaf(279, 330, 56, 0.85, 'var(--ivory)')}${leaf(287, 240, -48, 0.8, 'var(--sage)')}${leaf(293, 200, 44, 0.72, 'var(--sage)')}${leaf(292, 104, 4, 0.6, 'var(--olive)')}
  </g>
</svg>`;

const sprig = (cls = '') => `<svg class="sprig ${cls}" viewBox="0 0 120 200" aria-hidden="true"><g style="--bg:var(--ivory)"><path d="M60 196 C58 150 66 100 60 30" fill="none" stroke="currentColor" stroke-width="1.5"/>${leaf(59, 150, -55, 0.45, 'currentColor', false)}${leaf(61, 120, 52, 0.42, 'currentColor', false)}${leaf(62, 86, -48, 0.38, 'currentColor', false)}${leaf(60, 32, 0, 0.36, 'currentColor', false)}</g></svg>`;

// ---- Layout ---------------------------------------------------------------

const NAV = [['/', 'Home'], ['/portfolio', 'Portfolio'], ['/shop', 'Shop'], ['/about', 'About'], ['/contact', 'Contact']];
const isActive = (path, href) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));

const wordmark = (site) =>
  `<a class="wordmark" href="/" aria-label="${esc(site.name)} — home"><svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31 C11 22 12 14 12 4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 20 C4 18 2 10 4 6 C10 7 13 13 12 20Z M12 14 C18 12 21 6 20 2 C14 3 11 8 12 14Z" fill="currentColor"/></svg><span>${esc(site.name)}</span></a>`;

function layout(ctx, { title, description, body, jsonLd, noindex }) {
  const { site, path, base } = ctx;
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline}`;
  const desc = description || site.description;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add('js')</script>
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(base + (path === '/' ? '/' : path))}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(base + path)}">
<meta name="theme-color" content="#F6F4EC">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400..700;1,400..600&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${ASSET_V}">
<script src="/assets/app.js?v=${ASSET_V}" defer></script>
${jsonLd ? `<script type="application/ld+json">${safeJson(jsonLd)}</script>` : ''}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="container site-header__inner">
    ${wordmark(site)}
    <nav class="site-nav" aria-label="Main">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" data-nav-toggle>
        <span class="nav-toggle__lines" aria-hidden="true"></span><span class="sr-only">Menu</span>
      </button>
      <ul id="nav-menu" class="site-nav__list" data-nav-menu>
        ${NAV.map(([href, label]) => `<li><a href="${href}"${isActive(path, href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}
      </ul>
    </nav>
    <a class="cart-link" href="/cart"${path === '/cart' ? ' aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      <span class="sr-only">Cart, </span><span class="cart-count" data-cart-count>0</span><span class="sr-only"> items</span>
    </a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C240 10 480 0 720 30 S1200 80 1440 20 V80Z" fill="currentColor"/></svg>
  <div class="container site-footer__grid">
    <div>
      ${wordmark(site)}
      <p class="site-footer__lede">${esc(site.description)}</p>
    </div>
    <nav aria-label="Footer">
      <h2 class="footer-heading">Explore</h2>
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}<li><a href="/cart">Cart</a></li></ul>
    </nav>
    <div>
      <h2 class="footer-heading">Shop</h2>
      <ul>${site.productCategories.map((c) => `<li><a href="/shop?category=${esc(c.id)}">${esc(c.label)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="footer-heading">Elsewhere</h2>
      <ul>${site.socials.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>`).join('')}<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li></ul>
    </div>
  </div>
  <div class="container site-footer__base">
    <p>© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</p>
    <p>Digital products are delivered by secure download after payment.</p>
  </div>
</footer>
</body>
</html>`;
}

// ---- Shared components ----------------------------------------------------

const sectionHead = (eyebrow, title, link) =>
  `<div class="section-head" data-reveal><div><p class="eyebrow">${eyebrow}</p><h2 class="h2">${title}</h2></div>${link ? `<a class="link-arrow" href="${link[0]}">${link[1]}</a>` : ''}</div>`;

const projectCard = (p, i) => `
<article class="project-card" data-item data-category="${esc(p.category)}" data-index="${i}" data-reveal>
  <a class="project-card__link" href="/portfolio/${esc(p.slug)}">
    <div class="project-card__media">${art(p.tone, p.variant)}</div>
    <p class="project-card__meta"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></p>
    <h3 class="project-card__title">${esc(p.title)}</h3>
    <p class="project-card__summary">${esc(p.summary)}</p>
  </a>
</article>`;

const productCard = (p, i, site) => `
<article class="product-card" data-item data-category="${esc(p.category)}" data-title="${esc(`${p.title} ${p.summary}`.toLowerCase())}" data-price="${isSoon(p) ? 1e9 : p.price}" data-index="${i}" data-reveal>
  <a class="product-card__media" href="/shop/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${cover(p, site)}</a>
  <div class="product-card__body">
    <p class="eyebrow">${esc(catLabel(site, p.category))}</p>
    <h3 class="product-card__title"><a href="/shop/${esc(p.slug)}">${esc(p.title)}</a></h3>
    <p class="product-card__summary">${esc(p.summary)}</p>
    <div class="product-card__foot">
      <span class="price">${esc(priceLabel(p, site))}</span>
      <a class="btn btn--ghost btn--small" href="/shop/${esc(p.slug)}">View details<span class="sr-only">: ${esc(p.title)}</span></a>
    </div>
  </div>
</article>`;

const filterChips = (items, active = 'all', label = 'Filter by category') =>
  `<div class="chips" role="group" aria-label="${label}">${[['all', 'All'], ...items].map(([v, l]) => `<button type="button" class="chip" data-filter="${esc(v)}" aria-pressed="${v === active}">${esc(l)}</button>`).join('')}</div>`;

const newsletter = (heading = 'Letters from the studio', text = 'One thoughtful email a month: new work, new products, and notes on building a calm creative practice. No noise, unsubscribe any time.') => `
<section class="newsletter" id="newsletter" aria-labelledby="newsletter-title">
  <div class="container newsletter__inner" data-reveal>
    ${sprig('newsletter__sprig')}
    <div>
      <p class="eyebrow">Newsletter</p>
      <h2 class="h2" id="newsletter-title">${heading}</h2>
      <p class="lede">${text}</p>
    </div>
    <form class="inline-form" action="/api/subscribe" method="post" data-api-form>
      <label class="sr-only" for="nl-email">Email address</label>
      <input id="nl-email" type="email" name="email" required autocomplete="email" placeholder="you@example.com">
      <button class="btn btn--primary" type="submit">Subscribe</button>
      <p class="form-status" role="status" data-status></p>
    </form>
  </div>
</section>`;

const pageHero = (eyebrow, title, lede) => `
<section class="page-hero">
  <div class="container">
    <p class="eyebrow" data-reveal>${eyebrow}</p>
    <h1 class="display" data-reveal>${title}</h1>
    ${lede ? `<p class="lede page-hero__lede" data-reveal>${lede}</p>` : ''}
  </div>
  ${sprig('page-hero__sprig')}
</section>`;

// ---- Pages ----------------------------------------------------------------

export function home(ctx) {
  const { site, projects, products } = ctx;
  const featuredProjects = projects.filter((p) => p.featured).slice(0, 3);
  const featuredProducts = products.filter((p) => p.featured && !isSoon(p)).slice(0, 4);
  const body = `
<section class="hero">
  <div class="container hero__grid">
    <div class="hero__copy">
      <p class="eyebrow" data-reveal>${esc(site.tagline)}</p>
      <h1 class="display hero__title" data-reveal>Ideas that grow <em>slowly</em>, and&nbsp;last.</h1>
      <p class="lede" data-reveal>I’m an independent designer and writer. I make brand identities, editorial work and illustration for thoughtful clients — and publish ebooks, templates and resources for people building creative work of their own.</p>
      <div class="btn-row" data-reveal>
        <a class="btn btn--primary" href="/portfolio">Explore my work</a>
        <a class="btn btn--ghost" href="/shop">Visit store</a>
      </div>
    </div>
    <div class="hero__art" data-parallax="0.08">${heroArt()}</div>
  </div>
</section>

<section class="section" aria-labelledby="work-title">
  <div class="container">
    ${sectionHead('Selected work', '<span id="work-title">Recent projects</span>', ['/portfolio', 'All projects'])}
    <div class="work-feature">${featuredProjects.map(projectCard).join('')}</div>
  </div>
</section>

<section class="section section--beige" aria-labelledby="shop-title">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C320 0 640 60 960 30 S1300 0 1440 40 V80Z" fill="currentColor"/></svg>
  <div class="container">
    ${sectionHead('From the shop', '<span id="shop-title">Ebooks, templates &amp; tools</span>', ['/shop', 'Visit the store'])}
    <div class="product-grid">${featuredProducts.map((p, i) => productCard(p, i, site)).join('')}</div>
  </div>
</section>

<section class="section" aria-labelledby="intro-title">
  <div class="container split">
    <div class="split__media" data-parallax="0.05">${art('sage', 0, 'art--portrait')}</div>
    <div class="split__copy" data-reveal>
      <p class="eyebrow">Hello</p>
      <h2 class="h2" id="intro-title">A one-person studio with a long view.</h2>
      <p>For more than a decade I’ve helped small brands, publishers and makers find a visual voice that feels honest and lasts. The shop grew out of that work: the tools, systems and lessons I kept rebuilding for clients, packaged so anyone can use them.</p>
      <a class="link-arrow" href="/about">More about me</a>
    </div>
  </div>
</section>

<section class="philosophy" aria-labelledby="philosophy-title">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C200 20 520 0 760 40 S1240 70 1440 10 V80Z" fill="currentColor"/></svg>
  <div class="container">
    <p class="eyebrow" data-reveal>Philosophy</p>
    <blockquote class="philosophy__quote" data-reveal><p id="philosophy-title">“Good work is grown, not forced. Give an idea room, care and time, and it finds its own shape.”</p></blockquote>
    <ol class="principles">
      <li data-reveal><span class="principles__num">01</span><h3>Room to breathe</h3><p>Whitespace, focus and fewer, better things — in design and in how I work.</p></li>
      <li data-reveal><span class="principles__num">02</span><h3>Made to last</h3><p>Systems and objects that stay useful long after launch day.</p></li>
      <li data-reveal><span class="principles__num">03</span><h3>Quietly distinctive</h3><p>Character that comes from craft and care, not volume.</p></li>
    </ol>
  </div>
  ${sprig('philosophy__sprig')}
</section>

${newsletter()}`;
  return layout(ctx, { body, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: ctx.base } });
}

export function portfolio(ctx) {
  const { site, projects } = ctx;
  const body = `
${pageHero('Portfolio', 'Work grown with <em>care</em>.', 'Brand identities, editorial design, illustration and digital products for independent businesses — and a few personal projects that became something bigger.')}
<section class="section section--tight" data-filter-scope>
  <div class="container">
    <div class="toolbar">${filterChips(site.projectCategories.map((c) => [c, c]))}<p class="toolbar__count" role="status" data-count></p></div>
    <div class="work-grid">${projects.map(projectCard).join('')}</div>
    <p class="empty" hidden data-empty>No projects in this category yet.</p>
  </div>
</section>
<section class="section cta-band"><div class="container cta-band__inner" data-reveal><h2 class="h2">Have a project in mind?</h2><a class="btn btn--primary" href="/contact">Start a conversation</a></div></section>`;
  return layout(ctx, { title: 'Portfolio', description: `Selected brand, editorial, illustration and digital work by ${site.name}.`, body });
}

export function project(ctx, p) {
  const { projects } = ctx;
  const next = projects[(projects.indexOf(p) + 1) % projects.length];
  const body = `
<article>
  <header class="project-hero">
    <div class="container">
      <a class="link-back" href="/portfolio">Portfolio</a>
      <p class="eyebrow" data-reveal>${esc(p.category)} · ${esc(p.year)}</p>
      <h1 class="display" data-reveal>${esc(p.title)}</h1>
      <p class="lede project-hero__lede" data-reveal>${esc(p.summary)}</p>
    </div>
    <div class="container"><div class="project-hero__media" data-reveal>${art(p.tone, p.variant, 'art--wide')}</div></div>
  </header>
  <div class="container project-body">
    <dl class="meta-list" data-reveal>
      <div><dt>Client</dt><dd>${esc(p.client)}</dd></div>
      <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
      <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
      <div><dt>Discipline</dt><dd>${esc(p.category)}</dd></div>
    </dl>
    <div class="prose">${p.sections.map((s) => `<section data-reveal><h2 class="h3">${esc(s.heading)}</h2><p>${esc(s.text)}</p></section>`).join('')}</div>
  </div>
  <div class="container gallery">
    ${art(p.tone, p.variant + 1, 'gallery__a')}${art(p.tone === 'beige' ? 'forest' : 'beige', p.variant + 2, 'gallery__b')}
  </div>
</article>
<nav class="container next-project" aria-label="Next project">
  <a href="/portfolio/${esc(next.slug)}" data-reveal><span class="eyebrow">Next project</span><span class="display next-project__title">${esc(next.title)}</span></a>
</nav>`;
  return layout(ctx, { title: p.title, description: p.summary, body });
}

export function shop(ctx, category) {
  const { site, products } = ctx;
  const active = site.productCategories.some((c) => c.id === category) ? category : 'all';
  const body = `
${pageHero('Shop', 'Tools for a <em>calm</em> creative practice.', 'Ebooks, templates, guides and resources made in the studio. Instant digital delivery after secure checkout.')}
<section class="section section--tight" data-filter-scope>
  <div class="container">
    <div class="toolbar toolbar--shop">
      ${filterChips(site.productCategories.map((c) => [c.id, c.label]), active)}
      <div class="toolbar__controls">
        <label class="field field--search"><span class="sr-only">Search products</span>
          <input type="search" placeholder="Search products" data-search autocomplete="off">
        </label>
        <label class="field"><span class="sr-only">Sort products</span>
          <select data-sort>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="title">Name: A–Z</option>
          </select>
        </label>
      </div>
    </div>
    <p class="toolbar__count" role="status" data-count></p>
    <div class="product-grid">${products.map((p, i) => productCard(p, i, site)).join('')}</div>
    <p class="empty" hidden data-empty>Nothing matches that search. Try another word or category.</p>
  </div>
</section>`;
  return layout(ctx, { title: 'Shop', description: `Ebooks, digital templates, guides and resources by ${site.name}.`, body });
}

export function product(ctx, p) {
  const { site, products, base } = ctx;
  const soon = isSoon(p);
  const related = [...products.filter((x) => x !== p && x.category === p.category), ...products.filter((x) => x !== p && x.category !== p.category && !isSoon(x))].slice(0, 3);
  const buy = soon
    ? `<p class="note">This product is in development. Join the newsletter below to hear first when it launches.</p>`
    : `<div class="btn-row">
        <button class="btn btn--primary" type="button" data-buy-now="${esc(p.id)}">Buy now — ${esc(money(p.price, site.currency))}</button>
        <button class="btn btn--ghost" type="button" data-add-to-cart="${esc(p.id)}">Add to cart</button>
      </div>
      <p class="note">Secure checkout with Stripe. Your download link appears as soon as payment is confirmed.</p>`;
  const body = `
<div class="container">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/shop">Shop</a></li><li><a href="/shop?category=${esc(p.category)}">${esc(catLabel(site, p.category))}</a></li><li aria-current="page">${esc(p.title)}</li></ol></nav>
</div>
<section class="container product-detail">
  <div class="product-detail__media" data-parallax="0.04">${cover(p, site)}</div>
  <div class="product-detail__info">
    <p class="eyebrow">${esc(catLabel(site, p.category))}</p>
    <h1 class="display product-detail__title">${esc(p.title)}</h1>
    <p class="price price--large">${esc(priceLabel(p, site))}</p>
    <p class="lede">${esc(p.summary)}</p>
    ${buy}
    <div class="prose">${p.description.map((d) => `<p>${esc(d)}</p>`).join('')}</div>
    <h2 class="h3">What’s included</h2>
    <ul class="leaf-list">${p.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <h2 class="h3">Product information</h2>
    <dl class="meta-list meta-list--rows">
      ${Object.entries(p.info).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${soon ? '' : `<div><dt>Delivery</dt><dd>Instant download · ${site.download.days}-day link</dd></div>`}
    </dl>
  </div>
</section>
${soon ? newsletter('Be first to know', `Get a note when ${esc(p.title)} launches, plus monthly letters from the studio.`) : ''}
<section class="section section--beige">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C320 0 640 60 960 30 S1300 0 1440 40 V80Z" fill="currentColor"/></svg>
  <div class="container">
    ${sectionHead('You may also like', 'Related products', ['/shop', 'All products'])}
    <div class="product-grid product-grid--three">${related.map((r, i) => productCard(r, i, site)).join('')}</div>
  </div>
</section>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.summary, brand: site.name, url: `${base}/shop/${p.slug}`,
    ...(soon ? {} : { offers: { '@type': 'Offer', price: (p.price / 100).toFixed(2), priceCurrency: site.currency.toUpperCase(), availability: 'https://schema.org/InStock' } }),
  };
  return layout(ctx, { title: p.title, description: p.summary, body, jsonLd });
}

export function about(ctx) {
  const skills = [
    ['Disciplines', ['Brand identity', 'Editorial & book design', 'Illustration', 'Product & interface design', 'Writing']],
    ['Tools', ['Figma', 'Adobe InDesign & Illustrator', 'Procreate', 'Notion', 'HTML & CSS']],
    ['Interests', ['Botany & natural forms', 'Independent publishing', 'Typography', 'Slow living', 'Ceramics']],
  ];
  const body = `
<section class="about-hero">
  <div class="container split split--reverse">
    <div class="split__copy">
      <p class="eyebrow" data-reveal>About</p>
      <h1 class="display" data-reveal>Designer, writer, <em>gardener of ideas</em>.</h1>
      <p class="lede" data-reveal>I run ${esc(ctx.site.name)}, a one-person studio and shop. I design for small, thoughtful businesses and make digital products for creators who want their work to grow steadily.</p>
    </div>
    <div class="split__media" data-parallax="0.06">${art('forest', 2, 'art--portrait art--arch')}</div>
  </div>
</section>
<section class="section">
  <div class="container narrow prose prose--large">
    <h2 class="h2" data-reveal>The story so far</h2>
    <p data-reveal>I started as a junior designer in a busy agency, learning fast and burning out faster. The work was good, but it never had time to settle. So I left, took a handful of clients, and gave each project the time it actually needed.</p>
    <p data-reveal>Ten years later the studio is still small on purpose. I work with a few clients a year, write a monthly letter, and turn the systems I build for myself into products other people can use — ebooks, templates and resources that save the months of trial and error I went through.</p>
    <p data-reveal>Everything here is made by one person, with a lot of care, at a sustainable pace.</p>
  </div>
</section>
<section class="section section--beige">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C320 0 640 60 960 30 S1300 0 1440 40 V80Z" fill="currentColor"/></svg>
  <div class="container">
    ${sectionHead('Skills &amp; interests', 'What I bring to the table')}
    <div class="skills">${skills.map(([h, list]) => `<div class="skills__col" data-reveal><h3 class="h3">${h}</h3><ul class="leaf-list">${list.map((s) => `<li>${s}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>
</section>
<section class="philosophy">
  <svg class="edge edge--top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C200 20 520 0 760 40 S1240 70 1440 10 V80Z" fill="currentColor"/></svg>
  <div class="container">
    <p class="eyebrow" data-reveal>How I work</p>
    <blockquote class="philosophy__quote" data-reveal><p>“Make fewer things, make them well, and let them keep working long after you’ve moved on.”</p></blockquote>
    <ol class="principles">
      <li data-reveal><span class="principles__num">01</span><h3>Listen first</h3><p>Every project starts with understanding, not moodboards.</p></li>
      <li data-reveal><span class="principles__num">02</span><h3>Design in systems</h3><p>Pieces that work together, so the brand grows without breaking.</p></li>
      <li data-reveal><span class="principles__num">03</span><h3>Leave room</h3><p>Space for the work, the people using it, and what comes next.</p></li>
    </ol>
  </div>
</section>
<section class="section cta-band"><div class="container cta-band__inner" data-reveal><h2 class="h2">Let’s make something that lasts.</h2><a class="btn btn--primary" href="/contact">Get in touch</a></div></section>`;
  return layout(ctx, { title: 'About', description: `About ${ctx.site.name}: an independent designer, writer and maker of digital products.`, body });
}

export function contact(ctx) {
  const { site } = ctx;
  const body = `
${pageHero('Contact', 'Let’s <em>talk</em>.', 'For projects, collaborations, questions about an order, or just to say hello. I reply within two working days.')}
<section class="section section--tight">
  <div class="container contact">
    <form class="form" action="/api/contact" method="post" data-api-form data-reset-on-success>
      <div class="form__row">
        <label class="field"><span class="field__label">Name</span><input name="name" required maxlength="120" autocomplete="name"></label>
        <label class="field"><span class="field__label">Email</span><input name="email" type="email" required maxlength="200" autocomplete="email"></label>
      </div>
      <label class="field"><span class="field__label">What is this about?</span>
        <select name="topic">
          <option value="general">General enquiry</option>
          <option value="business">Business / project enquiry</option>
          <option value="collaboration">Collaboration</option>
          <option value="order">Question about an order</option>
        </select>
      </label>
      <label class="field"><span class="field__label">Message</span><textarea name="message" rows="7" required maxlength="5000"></textarea></label>
      <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      <div class="form__foot"><button class="btn btn--primary" type="submit">Send message</button><p class="form-status" role="status" data-status></p></div>
    </form>
    <aside class="contact__aside">
      <div class="contact__block"><h2 class="h3">Business enquiries</h2><p>Brand identity, editorial and digital projects. Please share a little about your timeline and budget.</p><a class="link-arrow" href="mailto:${esc(site.businessEmail)}">${esc(site.businessEmail)}</a></div>
      <div class="contact__block"><h2 class="h3">Collaborations</h2><p>Open to co-created products, publications, workshops and talks with people whose work I admire.</p><a class="link-arrow" href="mailto:${esc(site.email)}">${esc(site.email)}</a></div>
      <div class="contact__block"><h2 class="h3">Elsewhere</h2><ul class="social-list">${site.socials.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>`).join('')}</ul><p class="note">${esc(site.location)}</p></div>
    </aside>
  </div>
</section>`;
  return layout(ctx, { title: 'Contact', description: `Contact ${site.name} about projects, collaborations or orders.`, body });
}

export function cart(ctx) {
  const { site, products } = ctx;
  const catalog = Object.fromEntries(products.filter((p) => !isSoon(p)).map((p) => [p.id, { title: p.title, slug: p.slug, price: p.price, category: catLabel(site, p.category) }]));
  const body = `
${pageHero('Cart', 'Your <em>cart</em>.', '')}
<section class="section section--tight">
  <div class="container cart" data-cart data-currency="${esc(site.currency)}">
    <script type="application/json" data-catalog>${safeJson(catalog)}</script>
    <div class="cart__items">
      <ul class="cart__list" data-cart-list></ul>
      <div class="empty" hidden data-cart-empty><p>Your cart is empty.</p><a class="btn btn--ghost" href="/shop">Browse the shop</a></div>
    </div>
    <aside class="cart__summary" data-cart-summary hidden>
      <h2 class="h3">Summary</h2>
      <dl class="meta-list meta-list--rows"><div><dt>Total</dt><dd class="price price--large" data-cart-total></dd></div></dl>
      <button class="btn btn--primary btn--block" type="button" data-checkout>Checkout securely</button>
      <p class="form-status" role="status" data-status></p>
      <p class="note">You’ll pay on Stripe’s secure checkout page. Download links appear immediately after payment and stay active for ${site.download.days} days.</p>
    </aside>
  </div>
</section>`;
  return layout(ctx, { title: 'Cart', body, noindex: true });
}

export function success(ctx, order) {
  const { site, products } = ctx;
  const body = order
    ? `
${pageHero('Order confirmed', 'Thank you — your files are <em>ready</em>.', `Payment received${order.email ? ` for ${esc(order.email)}` : ''}. Download your files below. Links stay active for ${site.download.days} days (up to ${site.download.maxPerFile} downloads per file) — bookmark this page.`)}
<section class="section section--tight" data-clear-cart>
  <div class="container narrow">
    <ul class="download-list">${order.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean).map((p) => `
      <li><div><p class="eyebrow">${esc(catLabel(site, p.category))}</p><h2 class="h3">${esc(p.title)}</h2></div>
      <a class="btn btn--primary btn--small" href="/download/${esc(order.token)}/${esc(p.id)}" download>Download</a></li>`).join('')}
    </ul>
    <p class="note">Trouble downloading? <a href="/contact">Contact me</a> with your order email and I’ll help.</p>
  </div>
</section>`
    : `
${pageHero('Confirming payment', 'Confirming your <em>payment</em>…', 'This usually takes a few seconds. The page refreshes automatically. If you were not charged, nothing has been ordered.')}
<section class="section section--tight"><div class="container narrow"><p class="note" data-auto-refresh="5">Still waiting after a minute? <a href="/contact">Contact me</a> and include the email you paid with.</p></div></section>`;
  return layout(ctx, { title: order ? 'Order confirmed' : 'Confirming payment', body, noindex: true });
}

export function thanks(ctx, form) {
  const msg = form === 'newsletter' ? ['Subscribed', 'You’re on the <em>list</em>.', 'Thanks for subscribing. The next letter will arrive soon.'] : ['Message sent', 'Thank you — <em>message received</em>.', 'I’ll reply within two working days.'];
  return layout(ctx, { title: msg[0], body: pageHero(msg[0], msg[1], msg[2]) + '<div class="container section--tight"><a class="btn btn--ghost" href="/">Back home</a></div>', noindex: true });
}

export function downloadError(ctx, reason) {
  const text = {
    'not-found': 'This download link is not valid. Please check the link from your order confirmation.',
    expired: `This download link has expired (links last ${ctx.site.download.days} days). Contact me and I’ll send a fresh one.`,
    limit: 'This file has reached its download limit. Contact me and I’ll reset it.',
    missing: 'This file is temporarily unavailable. Please contact me and I’ll send it directly.',
  }[reason];
  return layout(ctx, { title: 'Download unavailable', body: pageHero('Download', 'Download <em>unavailable</em>', esc(text)) + '<div class="container section--tight"><a class="btn btn--primary" href="/contact">Contact me</a></div>', noindex: true });
}

export function notFound(ctx) {
  return layout(ctx, { title: 'Not found', body: pageHero('404', 'This path has <em>overgrown</em>.', 'The page you’re looking for doesn’t exist or has moved.') + '<div class="container section--tight btn-row"><a class="btn btn--primary" href="/">Back home</a><a class="btn btn--ghost" href="/shop">Visit the shop</a></div>', noindex: true });
}

export function sitemap({ base, projects, products }) {
  const paths = ['/', '/portfolio', '/shop', '/about', '/contact', ...projects.map((p) => `/portfolio/${p.slug}`), ...products.map((p) => `/shop/${p.slug}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${esc(base + p)}</loc></url>`).join('')}</urlset>`;
}
