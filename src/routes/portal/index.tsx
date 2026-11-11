import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { getShopAccount, getStorefront, listPortalServices } from "@/lib/portal/api";
import { money } from "@/lib/portal/format";
import { useShopToken } from "@/lib/portal/shop-session";
import { catalogHref } from "@/lib/portal/paths";
import { DataField, PortalPanel, StatTile } from "@/components/portal-ui";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

export function PortalHome() {
  const token = useShopToken();
  const session = usePortalSession();
  const account = useQuery({
    queryKey: ["shop-account", token],
    queryFn: () => getShopAccount({ data: token }),
    enabled: Boolean(token),
  });
  const requests = useQuery({
    queryKey: ["portal-services", token],
    queryFn: () => listPortalServices({ data: token }),
    enabled: Boolean(token),
  });
  const shop = useQuery({ queryKey: ["storefront"], queryFn: () => getStorefront() });
  if (!session.data) return <p className="text-sm text-muted">Opening your portal…</p>;
  const { customer, tickets } = session.data;
  const open = tickets.filter((ticket) => ticket.status !== "solved" && ticket.status !== "closed").length;
  const orders = account.data?.orders ?? [];
  const pendingOrders = orders.filter((order) => order.status !== "fulfilled" && order.status !== "cancelled").length;
  const pendingRequests = (requests.data ?? []).filter((item) => item.status === "requested" || item.status === "quoted").length;
  const activeServices = (requests.data ?? []).filter((item) => item.status === "approved" || item.status === "provisioned").length;
  const unpaid = orders.filter((order) => order.paymentMethod === "pay_later" || order.paymentMethod === "unpaid").length;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = customer.name.split(" ")[0] || "there";

  const place = [customer.city, customer.region].filter(Boolean).join(", ");

  return (
    <div className="grid w-full gap-4">
      <section className="grid gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{hello}, {first}.</h1>
        <p className="text-sm text-muted">Welcome to the MTS User Portal{session.data.organization || session.data.business ? ` · ${session.data.organization || session.data.business}` : ""}.</p>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Open tickets" value={open} />
        <StatTile label="Active services" value={activeServices} />
        <StatTile label="Pending orders" value={pendingOrders} />
        <StatTile label="Open requests" value={pendingRequests} />
        <StatTile label="Unpaid" value={unpaid} />
      </div>
      <PortalPanel title="Your details">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DataField label="Email" value={customer.email} />
          <DataField label="Phone" value={customer.phone} />
          <DataField label="Company" value={session.data.organization || session.data.business} />
          <DataField label="Role" value={session.data.access.roleLabel} />
          <DataField label="Location" value={place} />
          <DataField label="Country" value={customer.country} />
          <DataField label="Billing" value={customer.payLater ? "Order now, pay later" : "Pay at checkout"} />
          <DataField label="Account" value={session.data.verified ? "Verified" : "Pending verification"} />
        </div>
      </PortalPanel>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/portal/tickets" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">Create support ticket</Link>
        <Link to="/portal/shop" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">Order equipment or a service</Link>
        <Link to="/portal/orders" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">View orders</Link>
      </div>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Equipment</h2>
          <Link to="/portal/shop" className="text-sm font-semibold text-accent">Open orders</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(shop.data?.products ?? []).slice(0, 4).map((product) => (
            <a key={product.id} href={catalogHref(shop.data?.slug || "manage-tech-service", product.sku)} className="shop-card group grid overflow-hidden rounded-2xl border border-white/80 bg-surface/95 shadow-[0_12px_32px_rgba(0,57,112,0.06)]">
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-white to-surface-2">
                {product.imageUrl ? <img src={product.imageUrl} alt="" className="max-h-[86%] max-w-[86%] object-contain object-center" /> : <div className="size-12 rounded-2xl bg-white/70" />}
              </div>
              <div className="grid gap-1 p-3">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-sm text-muted">{money(product.priceCents)}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Recent tickets</h2>
          {tickets.slice(0, 4).map((ticket) => (
            <Link key={ticket.id} to="/portal/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="grid gap-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
              <span className="truncate font-semibold">{ticket.subject}</span>
              <span className="text-xs text-muted">{ticket.status} · {ticket.category}</span>
            </Link>
          ))}
          {tickets.length === 0 ? <p className="text-sm text-muted">No tickets yet.</p> : null}
        </section>
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Orders</h2>
          {orders.slice(0, 4).map((order) => (
            <Link key={order.id} to="/portal/orders/$orderId" params={{ orderId: String(order.id) }} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
              <span>
                <span className="block font-semibold">{order.number}</span>
                <span className="text-xs text-muted">{order.status} · {order.paymentMethod || "unpaid"}</span>
              </span>
              <span className="tabular-nums">{money(order.totalCents)}</span>
            </Link>
          ))}
          {orders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : null}
        </section>
      </div>
    </div>
  );
}
