import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { getShopAccount } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/orders/$orderId")({
  component: OrderDetail,
});

export function OrderDetail() {
  const { orderId = "" } = useParams({ strict: false });
  const token = useShopToken();
  const account = useQuery({ queryKey: ["shop-account", token], queryFn: () => getShopAccount({ data: token }), enabled: Boolean(token) });
  const order = account.data?.orders.find((item) => item.id === Number(orderId));
  if (account.isPending) return <p className="text-sm text-muted">Opening the order…</p>;
  if (!order) return <p className="text-sm text-muted">That order is not on this account.</p>;
  return (
    <div className="grid w-full gap-4">
      <Link to="/portal/orders" className="text-sm text-muted">All orders</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{order.number}</h1>
      <p className="text-sm text-muted">{order.status} · Shipment {order.shipmentStatus} · Payment {order.paymentMethod || "unpaid"}</p>
      {order.trackingNumber ? <p className="text-sm">Tracking {order.trackingCarrier || "carrier"} {order.trackingNumber}</p> : <p className="text-sm text-muted">No tracking number yet.</p>}
      <ul className="grid gap-2">
        {order.items.map((item) => (
          <li key={item.sku} className="flex justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <span>{item.quantity} × {item.name}</span>
            <span className="tabular-nums">{money(item.unitPriceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold">Total {money(order.totalCents)}</p>
      {order.paymentMethod === "pay_later" ? <p className="text-sm text-muted">This order is invoiced. It is not marked paid.</p> : null}
    </div>
  );
}
