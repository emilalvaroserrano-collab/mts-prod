import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Locked } from "@/components/customer-portal";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { listPortalServices } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/my-services")({
  component: MyServices,
});

export function MyServices() {
  const token = useShopToken();
  const session = usePortalSession();
  const mine = useQuery({ queryKey: ["portal-services", token], queryFn: () => listPortalServices({ data: token }), enabled: Boolean(token) });
  if (session.data && !session.data.access.canOrderIt && !session.data.access.canOrderPhone) {
    return <Locked title="No managed services on this account" body="Service ordering is approved from the admin desk. Tickets are still open to you." />;
  }
  const active = (mine.data ?? []).filter((item) => item.status === "approved" || item.status === "provisioned");
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">My active services</h1>
      {active.map((item) => (
        <article key={item.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="font-semibold">{item.serviceName}</p>
          <p className="text-xs text-muted">{item.status} · {item.category}</p>
        </article>
      ))}
      {mine.data && active.length === 0 ? <p className="text-sm text-muted">Nothing is provisioned yet. Open requests stay under Quotes.</p> : null}
    </div>
  );
}
