import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Locked } from "@/components/customer-portal";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { getShopAccount } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/billing")({
  component: BillingPage,
});

export function BillingPage() {
  const token = useShopToken();
  const session = usePortalSession();
  const account = useQuery({ queryKey: ["shop-account", token], queryFn: () => getShopAccount({ data: token }), enabled: Boolean(token) });
  if (session.data && !session.data.access.canShop && !session.data.access.canDefer) {
    return <Locked title="No billing on this account" body="Invoices and shop payments are turned on by an admin." />;
  }
  const orders = account.data?.orders ?? [];
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="text-sm text-muted">
        {session.data?.access.canDefer ? "This account may be invoiced. An unpaid invoice is not treated as paid." : "This account pays at checkout. Invoice purchasing is not approved."}
      </p>
      {orders.map((order) => (
        <article key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span>
            <span className="block font-semibold">{order.number}</span>
            <span className="text-xs text-muted">{order.paymentMethod || "unpaid"} · {order.status}</span>
          </span>
          <span className="tabular-nums">{money(order.totalCents)}</span>
        </article>
      ))}
      {account.data && orders.length === 0 ? <p className="text-sm text-muted">No charges yet.</p> : null}
    </div>
  );
}
