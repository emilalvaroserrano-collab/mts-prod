import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listCampaigns } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/campaigns")({
  component: CampaignsPage,
});

export function CampaignsPage() {
  const token = useShopToken();
  const campaigns = useQuery({ queryKey: ["campaigns", token], queryFn: () => listCampaigns({ data: token }), enabled: Boolean(token) });
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
      {(campaigns.data ?? []).map((item) => (
        <article key={item.id} className="grid gap-2 rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">{item.title}</h2>
          <p className="text-sm text-muted">{item.body}</p>
          {item.ctaHref.startsWith("/") ? <Link to={item.ctaHref as "/portal"} className="text-sm font-semibold text-accent">{item.ctaLabel || "Open"}</Link> : null}
        </article>
      ))}
      {campaigns.data && campaigns.data.length === 0 ? <p className="text-sm text-muted">No campaigns for this account.</p> : null}
    </div>
  );
}
