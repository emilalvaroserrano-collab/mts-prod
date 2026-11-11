import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getStorefront, orderCatalogService, orderPortalOffering } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { ORDER_MENU, type OrderCategoryId } from "@/lib/portal/order-menu";
import { useShopToken } from "@/lib/portal/shop-session";
import { addToCart } from "@/lib/portal/store-cart";

export const Route = createFileRoute("/portal/shop")({
  component: OrderPage,
});

const SITE_SERVICES = [
  { id: "network", label: "Connect an office", detail: "Bring the network or internet into a new office." },
  { id: "voip", label: "Phone and VoIP", detail: "A line, or an extension on the Telxent bill." },
  { id: "fax", label: "Fax", detail: "A physical fax line, or eFax to an email address." },
  { id: "internet", label: "Internet", detail: "Spectrum, AT&T Fiber, Frontier Fiber, or fixed wireless." },
  { id: "wiring", label: "Wiring", detail: "$175 per drop." },
] as const;

type SiteId = (typeof SITE_SERVICES)[number]["id"];
type Selection =
  | { source: "menu"; categoryId: OrderCategoryId; name: string }
  | { source: "site"; id: SiteId };

function ServiceMenu({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string; detail?: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => setOpen(true)}
        className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white px-4 text-left shadow-[0_8px_24px_rgba(0,57,112,0.05)] transition hover:border-accent/40"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{label}</span>
          <span className="block truncate text-sm font-medium">{current?.label || placeholder}</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2">
          <ChevronDown className={open ? "size-4 rotate-180 text-accent transition" : "size-4 text-muted transition"} />
        </span>
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[80] grid place-items-end p-3 sm:place-items-center sm:p-6" role="presentation">
              <button type="button" aria-label="Close service list" className="absolute inset-0 bg-[#003970]/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
              <div role="dialog" aria-modal="true" aria-label={label} className="relative z-10 grid max-h-[min(32rem,calc(100dvh-2rem))] w-full max-w-lg gap-3 overflow-hidden rounded-3xl border border-white/80 bg-white p-3 shadow-[0_24px_70px_rgba(0,57,112,0.28)] sm:p-4">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{label}</p>
                    <p className="truncate text-base font-semibold tracking-tight">{current?.label || placeholder}</p>
                  </div>
                  <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-1 overflow-auto pr-1">
                  {options.map((item) => {
                    const active = item.value === value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        className={active ? "flex w-full items-center justify-between gap-3 rounded-2xl bg-ink px-3.5 py-3 text-left text-white" : "flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left transition hover:bg-surface-2"}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{item.label}</span>
                          {item.detail ? <span className={active ? "block text-xs text-white/70" : "block text-xs text-muted"}>{item.detail}</span> : null}
                        </span>
                        <span className={active ? "size-2.5 shrink-0 rounded-full bg-accent" : "size-2.5 shrink-0 rounded-full border border-line"} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function OrderPage() {
  const token = useShopToken();
  const shop = useQuery({ queryKey: ["storefront"], queryFn: () => getStorefront() });
  const [tab, setTab] = useState<"equipment" | "services">("equipment");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState<string>(ORDER_MENU[0].id);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [site, setSite] = useState("");
  const [notes, setNotes] = useState("");
  const [voipKind, setVoipKind] = useState<"line" | "ext">("ext");
  const [shipPhone, setShipPhone] = useState(false);
  const [confirmMonthly, setConfirmMonthly] = useState(false);
  const [faxKind, setFaxKind] = useState<"physical" | "efax">("efax");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [provider, setProvider] = useState<"spectrum" | "att" | "frontier" | "fixed">("spectrum");
  const [drops, setDrops] = useState(1);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const products = shop.data?.products ?? [];
  const categories = useMemo(() => ["all", ...new Set(products.map((item) => item.category).filter(Boolean))], [products]);
  const visible = products.filter((item) => {
    const blob = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
    if (q && !blob.includes(q.toLowerCase())) return false;
    if (category !== "all" && item.category !== category) return false;
    return true;
  });
  const slug = shop.data?.slug || "manage-tech-service";
  const phones = products.filter((item) => /phone/i.test(`${item.name} ${item.category} ${item.sku}`));
  const siteId = selection?.source === "site" ? selection.id : selection?.name === "VoIP Phone System" ? "voip" : selection?.name === "Structured Data Cabling" ? "wiring" : null;

  const place = useMutation({
    mutationFn: () => {
      if (!selection) throw new Error("Choose a service.");
      if (selection.source === "menu" && !siteId) {
        return orderCatalogService({ data: { token, categoryId: selection.categoryId, name: selection.name, site, notes } });
      }
      const service = siteId || "network";
      const offering =
        service === "voip" ? (voipKind === "ext" ? "voip-ext" : "voip-line")
        : service === "fax" ? (faxKind === "efax" ? "fax-efax" : "fax-physical")
        : service === "internet" ? (`internet-${provider}` as const)
        : service;
      return orderPortalOffering({
        data: { token, offering, site, notes, recipientEmail, drops, shipPhone: service === "voip" && voipKind === "ext" && shipPhone, confirmMonthly },
      });
    },
    onSuccess: (result) => {
      if (siteId === "voip" && voipKind === "ext" && shipPhone) {
        addToCart(phones[0]?.sku || "desk-phone", 1);
        setDone(`Request ${result.id} is in. The desk phone is in your cart. Telxent still has to confirm the $18 monthly extension before it is billed.`);
      } else if (siteId === "voip" && voipKind === "ext") {
        setDone(`Request ${result.id} is in. You confirmed $18 per month. Telxent still has to confirm the extension before it is added to the bill.`);
      } else if (siteId === "wiring") {
        setDone(`Request ${result.id} is in. Wiring is ${money(drops * 17500)} for ${drops} drop${drops === 1 ? "" : "s"}. It is not billed until the desk confirms the work.`);
      } else {
        setDone(`Request ${result.id} is in. A ticket was opened for the desk.`);
      }
      setError("");
    },
    onError: (cause) => {
      setDone("");
      setError(cause instanceof Error ? cause.message : "Could not send the order.");
    },
  });

  return (
    <div className="grid w-full gap-5">
      <div className="grid gap-1">
        <h1 className="text-2xl font-medium tracking-tight">Order</h1>
        <p className="max-w-2xl text-sm text-muted">Whether you seek urgent support or long-term strategic planning, MTS offers a variety of expert services to help your business succeed.</p>
      </div>
      <div className="flex gap-2">
        {(["equipment", "services"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "h-10 rounded-full bg-ink px-4 text-sm font-medium text-white" : "h-10 rounded-full border border-line bg-surface/80 px-4 text-sm font-medium backdrop-blur-sm"}>
            {item === "equipment" ? "Equipment" : "Order services"}
          </button>
        ))}
      </div>
      {tab === "equipment" ? (
        <>
          <div className="grid gap-3">
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search equipment" aria-label="Search equipment" className="h-12 rounded-2xl border border-line bg-surface/90 px-4 shadow-sm backdrop-blur-sm" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={category === item ? "h-9 shrink-0 rounded-full bg-ink px-3 text-xs font-medium text-white" : "h-9 shrink-0 rounded-full border border-line bg-surface/80 px-3 text-xs font-medium"}>
                  {item === "all" ? "All" : item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {visible.map((product) => (
              <a key={product.id} href={`/store/${slug}/${product.sku}`} className="shop-card group grid overflow-hidden rounded-2xl border border-white/80 bg-surface/95 shadow-[0_12px_32px_rgba(0,57,112,0.06)]">
                <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-white to-surface-2">
                  {product.imageUrl ? <img src={product.imageUrl} alt="" className="max-h-[86%] max-w-[86%] object-contain object-center" /> : <div className="size-16 rounded-2xl bg-white/70" />}
                </div>
                <div className="grid gap-1 px-3.5 py-3.5">
                  {product.category ? <p className="text-[11px] font-medium tracking-wide text-accent uppercase">{product.category}</p> : null}
                  <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{product.name}</p>
                  <p className="text-sm text-ink">{money(product.priceCents)}</p>
                </div>
              </a>
            ))}
          </div>
          {visible.length === 0 ? <p className="text-sm text-muted">No equipment matches that search.</p> : null}
        </>
      ) : (
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" onSubmit={(event) => { event.preventDefault(); setError(""); place.mutate(); }}>
          <div className="grid content-start gap-3">
            {ORDER_MENU.map((group) => {
              const expanded = open === group.id;
              const value = selection?.source === "menu" && selection.categoryId === group.id ? selection.name : "";
              return (
                <section key={group.id} className="rounded-2xl border border-white/80 bg-surface/90 shadow-sm backdrop-blur-sm">
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left" aria-expanded={expanded} onClick={() => setOpen(expanded ? "" : group.id)}>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{group.title}</span>
                      <span className="block truncate text-xs text-muted">{value || `${group.items.length} services`}</span>
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
                      <ChevronDown className={expanded ? "size-4 rotate-180 text-accent transition" : "size-4 text-muted transition"} />
                    </span>
                  </button>
                  {expanded ? (
                    <div className="px-4 pb-4">
                      <ServiceMenu
                        label="Choose a service"
                        value={value}
                        placeholder={`Select ${group.title}`}
                        options={group.items.map((item) => ({ value: item, label: item }))}
                        onChange={(name) => {
                          setSelection(name ? { source: "menu", categoryId: group.id, name } : null);
                          setDone("");
                          setError("");
                        }}
                      />
                    </div>
                  ) : null}
                </section>
              );
            })}
            <section className="rounded-2xl border border-white/80 bg-surface/90 shadow-sm backdrop-blur-sm">
              <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left" aria-expanded={open === "site"} onClick={() => setOpen(open === "site" ? "" : "site")}>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Phone, internet, and wiring</span>
                  <span className="block truncate text-xs text-muted">{selection?.source === "site" ? SITE_SERVICES.find((item) => item.id === selection.id)?.label : "Extensions, fax, circuits, and drops"}</span>
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
                  <ChevronDown className={open === "site" ? "size-4 rotate-180 text-accent transition" : "size-4 text-muted transition"} />
                </span>
              </button>
              {open === "site" ? (
                <div className="px-4 pb-4">
                  <ServiceMenu
                    label="Choose a service"
                    value={selection?.source === "site" ? selection.id : ""}
                    placeholder="Select a site service"
                    options={SITE_SERVICES.map((item) => ({ value: item.id, label: item.label, detail: item.detail }))}
                    onChange={(id) => {
                      setSelection(id ? { source: "site", id: id as SiteId } : null);
                      setDone("");
                      setError("");
                    }}
                  />
                </div>
              ) : null}
            </section>
          </div>
          <div className="grid h-fit content-start gap-3 rounded-2xl border border-white/80 bg-surface/95 p-4 shadow-sm">
            <h2 className="text-sm font-medium">{selection?.source === "menu" ? selection.name : selection?.source === "site" ? SITE_SERVICES.find((item) => item.id === selection.id)?.label : "Service request"}</h2>
            {!selection ? <p className="text-sm text-muted">Open a category and choose a service from the menu.</p> : null}
            {siteId === "network" ? <p className="text-sm text-muted">Use this to connect an office to the network, or to bring internet into a new location.</p> : null}
            {siteId === "voip" ? (
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={voipKind === "line"} onChange={() => setVoipKind("line")} /> New VoIP phone line</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={voipKind === "ext"} onChange={() => setVoipKind("ext")} /> Add an extension</label>
                {voipKind === "ext" ? (
                  <div className="grid gap-2 rounded-xl bg-surface-2 p-3">
                    <p className="text-sm">An extension adds <span className="font-medium">$18 per month</span> to the Telxent VoIP bill. Telxent sends the confirmation. Nothing is billed until that confirmation comes back.</p>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={confirmMonthly} onChange={(event) => setConfirmMonthly(event.target.checked)} />
                      I agree to the $18 monthly extension on the Telxent bill.
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={shipPhone} onChange={(event) => setShipPhone(event.target.checked)} />
                      I need a phone shipped. Add a desk phone to the cart.
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
            {siteId === "fax" ? (
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={faxKind === "physical"} onChange={() => setFaxKind("physical")} /> Physical fax</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={faxKind === "efax"} onChange={() => setFaxKind("efax")} /> eFax</label>
                {faxKind === "efax" ? (
                  <label className="grid gap-1 text-sm">
                    Email that should receive incoming faxes
                    <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} type="email" required className="h-11 rounded-xl border border-line bg-white px-3" />
                  </label>
                ) : null}
              </div>
            ) : null}
            {siteId === "internet" ? (
              <div className="grid gap-2">
                {([
                  ["spectrum", "Spectrum cable"],
                  ["att", "AT&T Fiber"],
                  ["frontier", "Frontier Fiber"],
                  ["fixed", "Fixed wireless"],
                ] as const).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 text-sm"><input type="radio" checked={provider === id} onChange={() => setProvider(id)} /> {label}</label>
                ))}
              </div>
            ) : null}
            {siteId === "wiring" ? (
              <label className="grid gap-1 text-sm">
                Number of drops · $175 each
                <input value={drops} onChange={(event) => setDrops(Math.max(1, Number(event.target.value) || 1))} type="number" min={1} max={50} className="h-11 w-28 rounded-xl border border-line bg-white px-3" />
                <span className="text-muted">{money(drops * 17500)} before the desk confirms the work.</span>
              </label>
            ) : null}
            <label className="grid gap-1 text-sm">
              Office address
              <input value={site} onChange={(event) => setSite(event.target.value)} className="h-11 rounded-xl border border-line bg-white px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-xl border border-line bg-white px-3 py-2" />
            </label>
            {error ? <p className="text-sm text-bad">{error}</p> : null}
            {done ? <p className="text-sm">{done} {shipPhone ? <a className="font-medium text-accent" href={`/store/${slug}/checkout`}>Checkout the phone</a> : null}</p> : null}
            <button type="submit" disabled={place.isPending || !token || !selection} className="h-11 rounded-xl bg-ink px-4 text-sm font-medium text-white disabled:opacity-50">
              {place.isPending ? "Sending" : "Submit order"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
