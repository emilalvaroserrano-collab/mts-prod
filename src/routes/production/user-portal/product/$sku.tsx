import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { QtyStepper } from "@/components/storefront";
import { getStorefront } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { addToCart } from "@/lib/portal/store-cart";

export const Route = createFileRoute("/production/user-portal/product/$sku")({
  component: PortalProduct,
});

function PortalProduct() {
  const { sku = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const shop = useQuery({ queryKey: ["storefront"], queryFn: () => getStorefront() });
  const [qty, setQty] = useState(1);
  const product = shop.data?.products.find((item) => item.sku === sku);
  if (shop.isPending) return <p className="text-sm text-muted">Opening the product…</p>;
  if (!product) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted">That product is not in the shop.</p>
        <Link to="/production/user-portal/shop" className="text-sm font-semibold text-accent">Back to orders</Link>
      </div>
    );
  }
  const image = product.imageUrl;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[28px] bg-[#eef4f5]">
        {image ? <img src={image} alt="" className="max-h-[86%] max-w-[86%] object-contain" /> : null}
      </div>
      <div className="grid content-start gap-4">
        <Link to="/production/user-portal/shop" className="text-sm text-muted">Equipment</Link>
        {product.category ? <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">{product.category}</p> : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{product.name}</h1>
        <p className="text-2xl font-semibold tabular-nums">{money(product.priceCents)}</p>
        <p className="max-w-md text-base leading-7 text-muted">{product.description}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <QtyStepper value={qty} label={product.name} onChange={(next) => setQty(Math.max(1, next))} />
          <button type="button" onClick={() => addToCart(product.sku, qty)} className="h-12 flex-1 rounded-full bg-ink text-sm font-semibold text-white">Add to cart</button>
        </div>
        <button
          type="button"
          onClick={() => {
            addToCart(product.sku, qty);
            void navigate({ to: "/production/user-portal/checkout" });
          }}
          className="h-12 rounded-full border border-line text-sm font-semibold"
        >
          Buy it now
        </button>
      </div>
    </div>
  );
}
