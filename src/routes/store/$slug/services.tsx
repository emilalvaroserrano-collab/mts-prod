import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StoreFrame, useStore } from "@/components/storefront";
import { listPortalServices, listServiceCatalog, requestPortalService } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/store/$slug/services")({
  component: StoreServices,
});

function StoreServices() {
  const { slug } = useStore();
  const token = useShopToken();
  const client = useQueryClient();
  const catalog = useQuery({ queryKey: ["service-catalog"], queryFn: () => listServiceCatalog() });
  const mine = useQuery({
    queryKey: ["portal-services", token],
    queryFn: () => listPortalServices({ data: token }),
    enabled: Boolean(token),
  });
  const [picked, setPicked] = useState(0);
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [notice, setNotice] = useState("");
  const order = useMutation({
    mutationFn: () => requestPortalService({ data: { token, serviceId: picked, details, severity } }),
    onSuccess: () => {
      setNotice("Request sent. A ticket was opened for this account.");
      setDetails("");
      void client.invalidateQueries({ queryKey: ["portal-services", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not send the request."),
  });
  const groups = new Map<string, NonNullable<typeof catalog.data>>();
  for (const item of catalog.data ?? []) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  return (
    <StoreFrame>
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">MTS Services</h1>
        <p className="text-sm text-muted">Managed IT, cloud, projects, phone, and internet. Requesting one opens a ticket.</p>
        {!token ? (
          <Link to="/production/signin" className="flex h-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">Sign in to request a service</Link>
        ) : null}
        {[...groups.entries()].map(([category, items]) => (
          <section key={category} className="grid gap-2">
            <h2 className="text-sm font-semibold">{category}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPicked(item.id)}
                  className={picked === item.id ? "rounded-2xl border border-ink bg-white px-4 py-3 text-left" : "rounded-2xl border border-line bg-white px-4 py-3 text-left"}
                >
                  <span className="block text-sm font-semibold">{item.name}</span>
                  <span className="text-xs text-muted">{item.summary}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {token ? (
          <form
            className="grid gap-3 rounded-2xl border border-line bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice("");
              order.mutate();
            }}
          >
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-12 rounded-xl border border-line px-3">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} required placeholder="Sites, users, and what you need." className="min-h-24 rounded-xl border border-line px-3 py-3" />
            <button type="submit" disabled={order.isPending || !picked} className="h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-40">Request this service</button>
          </form>
        ) : null}
        {notice ? <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">{notice}</p> : null}
        {token ? (
          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">Your requests</h2>
            {(mine.data ?? []).map((item) => (
              <article key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
                <p className="font-semibold">{item.serviceName}</p>
                <p className="text-xs text-muted">{item.status}{item.quoteNote ? ` · ${item.quoteNote}` : ""}</p>
              </article>
            ))}
            {(mine.data ?? []).length === 0 ? <p className="text-sm text-muted">No service requests yet.</p> : null}
          </section>
        ) : null}
        <p className="text-xs text-muted">Store {slug}</p>
      </div>
    </StoreFrame>
  );
}
