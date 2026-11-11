import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Locked } from "@/components/customer-portal";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { listPortalServices, respondToQuote } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/quotes")({
  component: QuotesPage,
});

export function QuotesPage() {
  const token = useShopToken();
  const client = useQueryClient();
  const session = usePortalSession();
  const mine = useQuery({ queryKey: ["portal-services", token], queryFn: () => listPortalServices({ data: token }), enabled: Boolean(token) });
  const respond = useMutation({
    mutationFn: (input: { id: number; decision: "accepted" | "rejected" }) => respondToQuote({ data: { token, ...input } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["portal-services", token] }),
  });
  if (session.data && !session.data.access.canOrderIt && !session.data.access.canOrderPhone) {
    return <Locked title="Quotes are not open yet" body="An admin approves service ordering before a quote can be requested." />;
  }
  return (
    <div className="grid w-full gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Quotes and requests</h1>
      {(mine.data ?? []).map((item) => (
        <article key={item.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="font-semibold">{item.serviceName}</p>
          <p className="text-xs text-muted">{item.status}{item.quoteNote ? ` · ${item.quoteNote}` : ""}</p>
          <p className="mt-2 whitespace-pre-wrap text-muted">{item.details}</p>
          {item.status === "quoted" ? (
            <div className="mt-3 flex gap-2">
              <button type="button" className="h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-white" onClick={() => respond.mutate({ id: item.id, decision: "accepted" })}>Accept</button>
              <button type="button" className="h-10 rounded-xl border border-line px-3 text-xs font-semibold" onClick={() => respond.mutate({ id: item.id, decision: "rejected" })}>Decline</button>
            </div>
          ) : null}
        </article>
      ))}
      {mine.data && mine.data.length === 0 ? <p className="text-sm text-muted">No requests yet.</p> : null}
    </div>
  );
}
