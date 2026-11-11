import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, LayoutGrid, List, Search, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StoreFrame, PhotoLightbox, useStore } from "@/components/storefront";
import { money } from "@/lib/portal/format";
import { addToCart } from "@/lib/portal/store-cart";
import type { Product } from "@/lib/portal/types";

export const Route = createFileRoute("/store/$slug/")({
  component: ShopPage,
});

function ShopPage() {
  return (
    <StoreFrame>
      <Shop />
    </StoreFrame>
  );
}

function Shop() {
  const { query } = useStore();
  const store = query.data;
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [added, setAdded] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [zoom, setZoom] = useState<Product | null>(null);
  const categories = useMemo(() => ["All", ...new Set(store?.products.map((product) => product.category).filter(Boolean) ?? [])], [store]);
  if (!store) return null;
  const needle = q.trim().toLowerCase();
  const products = store.products
    .filter((product) => (category === "All" || product.category === category) && (!needle || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(needle)))
    .sort((a, b) => {
      if (sort === "price-asc") return a.priceCents - b.priceCents;
      if (sort === "price-desc") return b.priceCents - a.priceCents;
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  const heroSlides = pickHero(store.products);
  const spotlight = store.products.find((product) => product.imageUrl && product.available) ?? store.products[0];
  const groups = categoryGroups(store.products);

  return (
    <main className="grid">
      <section className="overflow-hidden bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:gap-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="shop-rise grid content-start justify-items-center gap-4 text-center lg:justify-items-start lg:text-left">
            <p className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">The desk shop</p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">{store.brandName}</h1>
            <p className="max-w-md text-base leading-7 text-muted">
              {store.tagline || "Laptops, desk PCs, and the accessories that ship with them."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <a href="#catalog" className="shop-press inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">Shop the catalog</a>
              {spotlight ? (
                <Link to="/store/$slug/$sku" params={{ slug: store.slug, sku: spotlight.sku }} className="shop-press inline-flex h-12 items-center rounded-full border border-line bg-white px-6 text-sm font-semibold">
                  Featured
                </Link>
              ) : null}
            </div>
          </div>
          <HeroReel slides={heroSlides} slug={store.slug} />
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4">
        {[
          [Truck, "Free over $500", "Standard shipping"],
          [ShieldCheck, "Tracked orders", "Status in your account"],
          [Headphones, "Desk support", store.supportEmail || "Account team"],
          [LayoutGrid, `${store.products.length} products`, "Laptops, PCs, accessories"],
        ].map(([Icon, title, note]) => (
          <article key={String(title)} className="grid min-w-0 content-start gap-2 overflow-hidden rounded-2xl border border-line bg-white p-4">
            <Icon className="size-4 text-accent" />
            <p className="text-sm font-semibold">{String(title)}</p>
            <p className="line-clamp-2 text-xs text-muted">{String(note)}</p>
          </article>
        ))}
      </section>
      {groups.length ? (
        <section className="mx-auto grid w-full max-w-6xl gap-3 px-4 pb-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Shop by category</h2>
            <a href="#catalog" className="text-sm text-accent">All products</a>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {groups.map((group) => (
              <button
                key={group.name}
                type="button"
                onClick={() => {
                  setCategory(group.name);
                  document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="shop-card grid overflow-hidden rounded-3xl bg-white text-left"
              >
                {group.image ? <img src={group.image} alt="" className="aspect-[4/3] w-full bg-[#eef4f5] object-contain" /> : <div className="aspect-[4/3] bg-[#eef4f5]" />}
                <span className="grid gap-0.5 px-4 py-3">
                  <span className="truncate text-sm font-semibold">{group.name}</span>
                  <span className="text-xs text-muted">{group.count} {group.count === 1 ? "item" : "items"}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {spotlight ? (
        <section className="mx-auto grid w-full max-w-6xl px-4 py-4">
          <Link to="/store/$slug/$sku" params={{ slug: store.slug, sku: spotlight.sku }} className="grid overflow-hidden rounded-[28px] bg-ink text-white lg:grid-cols-[minmax(0,1fr)_18rem]">
            <span className="grid content-center gap-3 p-6 sm:p-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Featured</span>
              <span className="max-w-md text-3xl font-semibold tracking-tight">{spotlight.name}</span>
              <span className="max-w-md text-sm leading-6 text-white/70">{spotlight.description || spotlight.category}</span>
              <span className="text-lg font-semibold tabular-nums">{money(spotlight.priceCents)}</span>
            </span>
            {spotlight.imageUrl ? <img src={spotlight.imageUrl} alt="" className="h-56 w-full bg-white/10 object-contain lg:h-full" /> : null}
          </Link>
        </section>
      ) : null}
      <section id="catalog" className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 sm:py-12">
        {store.closed ? <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">The catalog is hidden right now. Ask your account team to turn it back on.</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search laptops, docks, accessories"
              id="shop-search"
              aria-label="Search products"
              className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-4 text-base outline-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products" className="h-12 w-full rounded-full border border-line bg-white px-4 text-sm sm:w-auto">
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name">Name</option>
            </select>
            <div className="flex shrink-0 rounded-full border border-line bg-white p-0.5" role="group" aria-label="Shop layout">
              <button type="button" aria-pressed={layout === "grid"} aria-label="Grid view" onClick={() => setLayout("grid")} className={layout === "grid" ? "grid size-11 place-items-center rounded-full bg-ink text-white" : "grid size-11 place-items-center rounded-full text-muted"}>
                <LayoutGrid className="size-4" />
              </button>
              <button type="button" aria-pressed={layout === "list"} aria-label="List view" onClick={() => setLayout("list")} className={layout === "list" ? "grid size-11 place-items-center rounded-full bg-ink text-white" : "grid size-11 place-items-center rounded-full text-muted"}>
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={item === category ? "shop-press h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-white" : "shop-press h-11 shrink-0 rounded-full bg-white px-4 text-sm text-muted"}>
              {item}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{products.length} {products.length === 1 ? "product" : "products"}</p>
        {products.length === 0 ? <p className="rounded-3xl bg-white py-16 text-center text-sm text-muted">Nothing matches that search.</p> : null}
        <div className={layout === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" : "grid w-full gap-3"}>
          {products.map((product, index) => (
            <article key={product.id} className={layout === "grid" ? "shop-card shop-rise grid min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-[24px] border border-line bg-white p-3" : "shop-card grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border border-line bg-white p-3"} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <button type="button" onClick={() => product.imageUrl && setZoom(product)} className={layout === "grid" ? "relative flex aspect-square items-center justify-center overflow-hidden rounded-[18px] bg-[#eef4f5]" : "flex size-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-[#eef4f5]"} aria-label={`View ${product.name}`}>
                {product.imageUrl ? <img src={product.imageUrl} alt="" className="max-h-[86%] max-w-[86%] object-contain object-center" /> : <div className="aspect-square" />}
                <span className={product.available && product.stock > 0 ? "absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink" : "absolute left-3 top-3 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-semibold text-white"}>
                  {product.available && product.stock > 0 ? `${product.stock} ready` : "Ask the desk"}
                </span>
              </button>
              {layout === "grid" ? (
                <>
                  <div className="grid min-w-0 gap-1 px-1 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{product.category}</p>
                    <div className="flex items-start justify-between gap-3">
                      <Link to="/store/$slug/$sku" params={{ slug: store.slug, sku: product.sku }} className="min-w-0 text-base font-semibold">{product.name}</Link>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{money(product.priceCents)}</p>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted">{product.description || product.specs || product.sku}</p>
                  </div>
                  <button type="button" onClick={() => markAdded(product.sku, setAdded)} className="shop-press mt-3 h-12 w-full self-end rounded-full bg-ink text-sm font-semibold text-white">
                    {added === product.sku ? "Added" : "Add to cart"}
                  </button>
                </>
              ) : (
                <div className="grid min-w-0 gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link to="/store/$slug/$sku" params={{ slug: store.slug, sku: product.sku }} className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{product.category}</p>
                      <p className="truncate text-sm font-semibold">{product.name}</p>
                    </Link>
                    <p className="text-sm font-semibold tabular-nums">{money(product.priceCents)}</p>
                  </div>
                  <button type="button" onClick={() => markAdded(product.sku, setAdded)} className="shop-press h-10 rounded-full bg-ink text-sm font-semibold text-white">
                    {added === product.sku ? "Added" : "Add"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        {zoom ? (
          <PhotoLightbox
            images={zoom.images.length ? zoom.images : zoom.imageUrl ? [zoom.imageUrl] : []}
            start={zoom.imageUrl}
            alt={zoom.name}
            onClose={() => setZoom(null)}
          />
        ) : null}
      </section>
    </main>
  );
}

function markAdded(sku: string, setAdded: (sku: string) => void) {
  addToCart(sku);
  setAdded(sku);
  window.setTimeout(() => setAdded(""), 1200);
}

function categoryGroups(products: Product[]) {
  const map = new Map<string, { name: string; count: number; image: string }>();
  for (const product of products) {
    const name = product.category || "Other";
    const current = map.get(name) ?? { name, count: 0, image: "" };
    current.count += 1;
    if (!current.image && product.imageUrl) current.image = product.imageUrl;
    map.set(name, current);
  }
  return [...map.values()].slice(0, 4);
}

function pickHero(products: Product[]) {
  const withImage = products.filter((product) => product.imageUrl);
  const picked: Product[] = [];
  const seen = new Set<string>();
  for (const product of withImage) {
    if (seen.has(product.category)) continue;
    seen.add(product.category);
    picked.push(product);
  }
  for (const product of withImage) {
    if (picked.length >= 6) break;
    if (!picked.some((item) => item.sku === product.sku)) picked.push(product);
  }
  return picked.slice(0, 6);
}

function HeroReel({ slides, slug }: { slides: Product[]; slug: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  if (slides.length === 0) return null;
  const active = index % slides.length;
  const slide = slides[active];
  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative h-72 w-full overflow-hidden rounded-[32px] bg-[#e7f1f3] sm:h-80 lg:h-[28rem]">
        {slides.map((item, itemIndex) => (
          <Link
            key={item.sku}
            to="/store/$slug/$sku"
            params={{ slug, sku: item.sku }}
            aria-hidden={itemIndex !== active}
            className={itemIndex === active ? "hero-slide absolute inset-0 grid place-items-center p-6" : "pointer-events-none absolute inset-0 grid place-items-center p-6 opacity-0"}
          >
            <img src={item.imageUrl} alt="" className="h-full w-auto max-w-full object-contain" />
          </Link>
        ))}
        {slide ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 grid gap-0.5 rounded-2xl bg-white/90 px-4 py-3 text-left backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{slide.category}</p>
            <p className="truncate text-sm font-semibold">{slide.name}</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {slides.map((item, itemIndex) => (
          <button key={item.sku} type="button" aria-label={item.name} onClick={() => setIndex(itemIndex)} className={itemIndex === active ? "h-2 w-6 rounded-full bg-ink" : "size-2 rounded-full bg-ink/25"} />
        ))}
      </div>
    </div>
  );
}
