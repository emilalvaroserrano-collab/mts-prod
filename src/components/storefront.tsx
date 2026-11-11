import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Headphones, Home, Minus, Plus, ShoppingBag, UserRound, Wrench, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getStorefront } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { setCartQuantity, useCart, useCartNotice } from "@/lib/portal/store-cart";
import type { Product } from "@/lib/portal/types";

const FREE_SHIPPING = 50000;

export function useStore() {
  const { slug: requested } = useParams({ strict: false }) as { slug?: string };
  const query = useQuery({ queryKey: ["storefront"], queryFn: () => getStorefront() });
  const slug = requested || query.data?.slug || "";
  return { slug, requested, query };
}

export function StoreFrame({ children }: { children: ReactNode }) {
  const { slug, requested, query } = useStore();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [cartOpen, setCartOpen] = useState(false);
  const lines = useCart();
  const notice = useCartNotice();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const checkout = path.includes("/checkout");

  if (query.isPending) {
    return <main className="grid min-h-screen place-items-center bg-white text-sm text-muted">Opening the shop…</main>;
  }
  if (query.isError) {
    return <main className="grid min-h-screen place-items-center bg-white px-6 text-sm text-bad">{query.error.message}</main>;
  }
  const store = query.data;
  if (requested && store.slug !== requested) return <Navigate to="/store/$slug" params={{ slug: store.slug }} />;

  if (checkout) {
    return (
      <div className="min-h-screen max-w-full overflow-x-auto bg-white text-ink">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-8">
            <Link to="/store/$slug" params={{ slug: store.slug }} className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">MT</span>
              <span className="text-sm font-semibold">{store.brandName}</span>
            </Link>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh max-w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-x-auto text-ink">
      <div className="bg-ink px-4 py-2.5 text-center text-[12px] text-white/85">
        {store.tagline || "Free standard shipping on orders over $500."}
      </div>
      <header className="sticky top-0 z-20 border-b border-line/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/store/$slug" params={{ slug: store.slug }} className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl bg-ink text-[11px] font-semibold text-white">MT</span>
            <span className="truncate text-sm font-semibold">{store.brandName}</span>
          </Link>
          <nav className="ml-4 hidden min-w-0 items-center gap-5 text-[13px] md:flex" aria-label="Store">
            <Link to="/store/$slug" params={{ slug: store.slug }} className={path === `/store/${store.slug}` || path === `/store/${store.slug}/` ? "font-semibold text-ink" : "text-muted hover:text-ink"}>Shop</Link>
            <Link to="/store/$slug/services" params={{ slug: store.slug }} className={path.includes("/services") ? "font-semibold text-ink" : "text-muted hover:text-ink"}>MTS Services</Link>
            <Link to="/store/$slug/tickets" params={{ slug: store.slug }} className={path.includes("/tickets") ? "font-semibold text-ink" : "text-muted hover:text-ink"}>Tickets</Link>
            <Link to="/store/$slug/account" params={{ slug: store.slug }} className={path.includes("/account") ? "font-semibold text-ink" : "text-muted hover:text-ink"}>Account</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/store/$slug/account"
              params={{ slug: store.slug }}
              className="shop-press grid size-11 place-items-center rounded-full text-ink hover:bg-accent-soft"
              aria-label="Account"
            >
              <UserRound className="size-5" />
            </Link>
            <button
              type="button"
              className="shop-press relative grid size-11 place-items-center rounded-full bg-ink text-white"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${count} items`}
            >
              <ShoppingBag className="size-5" />
              {count > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-5 text-white">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>
      <div className="pb-24 md:pb-0">{children}</div>
      <footer className="border-t border-line bg-white px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold">{store.brandName}</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{store.tagline || "Laptops, PCs, and the accessories that go with them."}</p>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Shop</p>
            <Link to="/store/$slug" params={{ slug: store.slug }} className="text-muted">Shop</Link>
            <Link to="/store/$slug/services" params={{ slug: store.slug }} className="text-muted">MTS Services</Link>
            <Link to="/store/$slug/tickets" params={{ slug: store.slug }} className="text-muted">Tickets</Link>
            <Link to="/store/$slug/account" params={{ slug: store.slug }} className="text-muted">Account</Link>
          </div>
          <div className="grid content-start gap-2 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Support</p>
            <p className="break-words text-muted">{store.supportEmail || "Ask your account team."}</p>
            <p className="text-muted">Free standard shipping over $500.</p>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-white/95 px-1 pt-1 backdrop-blur md:hidden" style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }} aria-label="Shop">
        <ShopTab to="/store/$slug" params={{ slug: store.slug }} active={path === `/store/${store.slug}` || path === `/store/${store.slug}/`} icon={Home} label="Shop" />
        <ShopTab to="/store/$slug/services" params={{ slug: store.slug }} active={path.includes("/services")} icon={Wrench} label="Services" />
        <ShopTab to="/store/$slug/tickets" params={{ slug: store.slug }} active={path.includes("/tickets")} icon={Headphones} label="Tickets" />
        <ShopTab to="/store/$slug/account" params={{ slug: store.slug }} active={path.includes("/account")} icon={UserRound} label="Account" />
      </nav>
      {notice ? <AddedToast products={store.products} notice={notice} onOpen={() => setCartOpen(true)} /> : null}
      {cartOpen ? <CartDrawer products={store.products} slug={store.slug} onClose={() => setCartOpen(false)} /> : null}
    </div>
  );
}

function ShopTab({
  to,
  params,
  hash,
  active,
  icon: Icon,
  label,
}: {
  to: "/store/$slug" | "/store/$slug/account" | "/store/$slug/services" | "/store/$slug/tickets";
  params: { slug: string };
  hash?: string;
  active: boolean;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link to={to} params={params} hash={hash} className={active ? "shop-press flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-ink" : "shop-press flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted"}>
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function AddedToast({ products, notice, onOpen }: { products: Product[]; notice: { sku: string; at: number }; onOpen: () => void }) {
  const [visible, setVisible] = useState(true);
  const product = products.find((item) => item.sku === notice.sku);
  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(timer);
  }, [notice.at, notice.sku]);
  if (!visible || !product) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shop-rise fixed inset-x-4 bottom-24 z-30 flex items-center gap-3 rounded-2xl bg-ink px-3 py-3 text-left text-white shadow-lg md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-12 rounded-xl object-cover" /> : <span className="size-12 rounded-xl bg-white/10" />}
      <span>
        <span className="block text-sm font-semibold">Added to cart</span>
        <span className="block text-xs text-white/70">{product.name}</span>
      </span>
    </button>
  );
}

export function QtyStepper({ value, onChange, label }: { value: number; onChange: (next: number) => void; label: string }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-white">
      <button type="button" className="shop-press grid size-11 place-items-center" aria-label={`Decrease ${label}`} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" className="shop-press grid size-11 place-items-center" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(99, value + 1))}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function CartDrawer({ products, slug, onClose }: { products: Product[]; slug: string; onClose: () => void }) {
  const lines = useCart();
  const detailed = lines.map((line) => ({ ...line, product: products.find((product) => product.sku === line.sku) })).filter((line) => line.product);
  const total = detailed.reduce((sum, line) => sum + line.quantity * (line.product?.priceCents ?? 0), 0);
  const remaining = Math.max(0, FREE_SHIPPING - total);
  return (
    <div className="fixed inset-0 z-40">
      <button className="shop-fade absolute inset-0 bg-ink/40" aria-label="Close cart" onClick={onClose} />
      <aside className="shop-drawer absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex h-16 items-center justify-between px-4">
          <p className="text-base font-semibold">Your cart</p>
          <button type="button" aria-label="Close" onClick={onClose} className="shop-press grid size-11 place-items-center rounded-full hover:bg-accent-soft">
            <X className="size-5" />
          </button>
        </div>
        <div className="mx-4 rounded-2xl bg-accent-soft px-4 py-3 text-xs text-ink">
          {remaining === 0 ? "Standard shipping is free on this order." : `Add ${money(remaining)} more for free standard shipping.`}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (total / FREE_SHIPPING) * 100)}%` }} />
          </div>
        </div>
        <div className="grid min-h-0 flex-1 content-start overflow-y-auto px-4">
          {detailed.length === 0 ? <p className="py-16 text-center text-sm text-muted">Your cart is empty.</p> : null}
          {detailed.map((line) => (
            <div key={line.sku} className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 border-b border-line py-4">
              {line.product?.imageUrl ? <img src={line.product.imageUrl} alt="" className="size-20 rounded-2xl bg-[#f3f6f7] object-cover" /> : <div className="size-20 rounded-2xl bg-[#f3f6f7]" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.product?.name}</p>
                <p className="mt-1 text-sm text-muted">{money(line.product?.priceCents ?? 0)}</p>
                <div className="mt-2">
                  <QtyStepper value={line.quantity} label={line.product?.name ?? "item"} onChange={(next) => setCartQuantity(line.sku, next)} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-4 pb-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
          </div>
          <p className="mb-3 text-xs text-muted">Shipping and taxes are calculated at checkout.</p>
          <Link
            to="/store/$slug/checkout"
            params={{ slug }}
            onClick={onClose}
            className={`shop-press flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white ${detailed.length === 0 ? "pointer-events-none opacity-40" : ""}`}
          >
            Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function SummaryToggle({ total, children }: { total: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#f3f6f7] lg:bg-transparent">
      <button type="button" className="flex h-14 w-full items-center justify-between px-4 text-sm font-semibold text-accent lg:hidden" onClick={() => setOpen((value) => !value)}>
        <span className="inline-flex items-center gap-1">{open ? "Hide order summary" : "Show order summary"} <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} /></span>
        <span className="text-ink tabular-nums">{total}</span>
      </button>
      <div className={open ? "shop-rise px-4 pb-4 lg:hidden" : "hidden"}>{children}</div>
    </div>
  );
}

export function PhotoLightbox({ images, start, alt, onClose }: { images: string[]; start: string; alt: string; onClose: () => void }) {
  const list = images.length ? images : start ? [start] : [];
  const [index, setIndex] = useState(Math.max(0, list.indexOf(start)));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % list.length);
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + list.length) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list.length, onClose]);
  const src = list[index] ?? start;
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-8">
      <button type="button" className="shop-fade absolute inset-0 bg-ink/80" aria-label="Close photo" onClick={onClose} />
      <figure className="shop-lightbox relative z-10 grid w-full max-w-3xl justify-items-center gap-3">
        <img key={src} src={src} alt={alt} className="max-h-[74vh] w-full rounded-3xl bg-[#eef4f5] object-contain" />
        <figcaption className="text-sm text-white">{alt}</figcaption>
        <div className="flex items-center gap-2">
          {list.length > 1 ? (
            <button type="button" className="shop-press h-11 rounded-full bg-white px-4 text-sm font-semibold" onClick={() => setIndex((current) => (current - 1 + list.length) % list.length)}>
              Previous
            </button>
          ) : null}
          <button type="button" className="shop-press h-11 rounded-full bg-white px-4 text-sm font-semibold" onClick={onClose}>
            Close
          </button>
          {list.length > 1 ? (
            <button type="button" className="shop-press h-11 rounded-full bg-white px-4 text-sm font-semibold" onClick={() => setIndex((current) => (current + 1) % list.length)}>
              Next
            </button>
          ) : null}
        </div>
      </figure>
    </div>
  );
}
