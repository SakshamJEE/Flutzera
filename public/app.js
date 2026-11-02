// Progressive enhancement: every page works without this file except cart and filtering.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = document.documentElement.dataset.base || ''; // '/Flutzera' on GitHub Pages

// ---- Cart (localStorage, product ids only — prices are resolved on the server) ----
const CART_KEY = 'cart';
const getCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
};
const setCart = (ids) => {
  try { localStorage.setItem(CART_KEY, JSON.stringify([...new Set(ids)])); } catch {}
  updateCount();
};
const updateCount = () => $$('[data-cart-count]').forEach((el) => (el.textContent = getCart().length));
addEventListener('storage', updateCount);

// ---- Header ----
const header = $('[data-header]');
const toggle = $('[data-nav-toggle]');
const menu = $('[data-nav-menu]');
const setMenu = (open) => {
  toggle.setAttribute('aria-expanded', open);
  menu.classList.toggle('is-open', open);
};
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', (e) => e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true' && (setMenu(false), toggle.focus()));

// ---- Scroll: sticky header shadow + gentle parallax ----
const parallax = reducedMotion ? [] : $$('[data-parallax]');
let ticking = false;
const onScroll = () => {
  header?.classList.toggle('is-scrolled', scrollY > 8);
  for (const el of parallax) {
    const r = el.getBoundingClientRect();
    const offset = (r.top + r.height / 2 - innerHeight / 2) * Number(el.dataset.parallax);
    el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
  }
  ticking = false;
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

// ---- Reveal on scroll ----
if ('IntersectionObserver' in window && !reducedMotion) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
} else {
  $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

// ---- Filter / search / sort (portfolio + shop) ----
for (const scope of $$('[data-filter-scope]')) {
  const items = $$('[data-item]', scope);
  const grid = items[0]?.parentElement;
  const chips = $$('[data-filter]', scope);
  const search = $('[data-search]', scope);
  const sort = $('[data-sort]', scope);
  const count = $('[data-count]', scope);
  const empty = $('[data-empty]', scope);
  const fromUrl = new URLSearchParams(location.search).get('category');
  let category = (chips.some((c) => c.dataset.filter === fromUrl) && fromUrl) || chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all';
  chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.filter === category));

  const sorters = {
    featured: (a, b) => a.dataset.index - b.dataset.index,
    'price-asc': (a, b) => a.dataset.price - b.dataset.price,
    'price-desc': (a, b) => (b.dataset.price % 1e9) - (a.dataset.price % 1e9), // coming-soon items sort last
    title: (a, b) => a.dataset.title.localeCompare(b.dataset.title),
  };

  const apply = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    for (const el of items) {
      const visible = (category === 'all' || el.dataset.category === category) && (!q || el.dataset.title.includes(q));
      el.hidden = !visible;
      if (visible) { shown++; el.classList.add('is-visible'); }
    }
    if (sort) items.slice().sort(sorters[sort.value]).forEach((el) => grid.append(el));
    if (count) count.textContent = `${shown} ${shown === 1 ? 'item' : 'items'}`;
    if (empty) empty.hidden = shown > 0;
  };

  chips.forEach((chip) => chip.addEventListener('click', () => {
    category = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', c === chip));
    const url = new URL(location.href);
    category === 'all' ? url.searchParams.delete('category') : url.searchParams.set('category', category);
    history.replaceState(null, '', url);
    apply();
  }));
  search?.addEventListener('input', apply);
  sort?.addEventListener('change', apply);
  apply();
}

// ---- Add to cart / buy now ----
$$('[data-add-to-cart]').forEach((btn) => btn.addEventListener('click', () => {
  setCart([...getCart(), btn.dataset.addToCart]);
  btn.textContent = 'Added — view cart';
  btn.onclick = () => (location.href = `${BASE}/cart`);
}));
$$('[data-buy-now]').forEach((btn) => btn.addEventListener('click', () => {
  setCart([...getCart(), btn.dataset.buyNow]);
  location.href = `${BASE}/cart`;
}));

// ---- Cart page ----
const cartEl = $('[data-cart]');
if (cartEl) {
  const catalog = JSON.parse($('[data-catalog]', cartEl).textContent);
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: cartEl.dataset.currency });
  const list = $('[data-cart-list]', cartEl);
  const status = $('[data-status]', cartEl);
  const checkout = $('[data-checkout]', cartEl);

  const render = () => {
    const ids = getCart().filter((id) => catalog[id]); // drop products removed from the catalogue
    setCart(ids);
    list.replaceChildren(...ids.map((id) => {
      const p = catalog[id];
      const li = document.createElement('li');
      li.innerHTML = `<div><p class="eyebrow"></p><a></a></div><span class="price"></span><button type="button" class="cart__remove">Remove</button>`;
      li.querySelector('.eyebrow').textContent = p.category;
      li.querySelector('a').textContent = p.title;
      li.querySelector('a').href = `${BASE}/shop/${p.slug}`;
      li.querySelector('.price').textContent = fmt.format(p.price / 100);
      const remove = li.querySelector('button');
      remove.setAttribute('aria-label', `Remove ${p.title}`);
      remove.onclick = () => { setCart(getCart().filter((x) => x !== id)); render(); };
      return li;
    }));
    $('[data-cart-total]', cartEl).textContent = fmt.format(ids.reduce((sum, id) => sum + catalog[id].price, 0) / 100);
    $('[data-cart-empty]', cartEl).hidden = ids.length > 0;
    $('[data-cart-summary]', cartEl).hidden = ids.length === 0;
  };
  render();

  checkout.addEventListener('click', async () => {
    checkout.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Opening secure checkout…';
    try {
      const res = await fetch(`${BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: getCart() }),
      });
      // Static hosting (GitHub Pages) has no API and answers with HTML, so json() can fail.
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is not open yet. No charge was made.');
      location.href = data.url;
    } catch (err) {
      status.className = 'form-status is-error';
      status.textContent = err.message;
      checkout.disabled = false;
    }
  });
}

// Success page: purchase confirmed by the server, so the cart can be emptied.
if ($('[data-clear-cart]')) setCart([]);
const refresh = $('[data-auto-refresh]');
if (refresh) setTimeout(() => location.reload(), refresh.dataset.autoRefresh * 1000);

// ---- Forms (contact + newsletter) ----
$$('[data-api-form]').forEach((form) => form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('[data-status]', form);
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  status.className = 'form-status';
  status.textContent = 'Sending…';
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json().catch(() => null);
    if (!data) throw new Error('This form is not connected yet. Please email instead — the address is in the footer.');
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    form.reset();
    status.className = 'form-status is-success';
    status.textContent = form.action.endsWith('/api/subscribe') ? 'Thank you — you’re subscribed.' : 'Thank you — your message has been sent. I’ll reply within two working days.';
  } catch (err) {
    status.className = 'form-status is-error';
    status.textContent = err.message === 'Failed to fetch' ? 'Network error. Please check your connection and try again.' : err.message;
  } finally {
    button.disabled = false;
  }
}));

updateCount();
