import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Locked } from "@/components/customer-portal";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { getShopAccount } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/orders/")({
  component: OrdersPage,
});

export function OrdersPage() {
  const token = useShopToken();
  const session = usePortalSession();
  const account = useQuery({ queryKey: ["shop-account", token], queryFn: () => getShopAccount({ data: token }), enabled: Boolean(token) });
  if (session.data && !session.data.access.canShop) {
    return <Locked title="Orders stay with shop access" body="This account can open tickets. Purchasing has not been approved." />;
  }
  const orders = account.data?.orders ?? [];
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
      {orders.map((order) => (
        <Link key={order.id} to="/portal/orders/$orderId" params={{ orderId: String(order.id) }} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span>
            <span className="block font-semibold">{order.number}</span>
            <span className="text-xs text-muted">{order.status} · {order.shipmentStatus} · {order.paymentMethod || "unpaid"}</span>
          </span>
          <span className="tabular-nums">{money(order.totalCents)}</span>
        </Link>
      ))}
      {account.data && orders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : null}
    </div>
  );
}
