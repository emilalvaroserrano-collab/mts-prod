import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { listServiceCatalog } from "@/lib/portal/api";

export const Route = createFileRoute("/portal/services/")({
  component: PortalServices,
});

export function PortalServices() {
  const session = usePortalSession();
  const catalog = useQuery({ queryKey: ["service-catalog"], queryFn: () => listServiceCatalog() });
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...new Set((catalog.data ?? []).map((item) => item.category))], [catalog.data]);
  const items = (catalog.data ?? []).filter((item) => {
    const text = `${item.name} ${item.summary} ${item.category}`.toLowerCase();
    return (category === "All" || item.category === category) && text.includes(q.toLowerCase());
  });
  const access = session.data?.access;
  const canOrder = Boolean(access?.canOrderIt || access?.canOrderPhone);

  return (
    <div className="grid w-full gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IT services</h1>
        <p className="mt-1 text-sm text-muted">
          {canOrder ? "Choose a service. A request opens a ticket and waits for a quote. Nothing is billed until the desk approves it." : "You can read the catalog. Ordering stays off until an admin approves this account."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search services" aria-label="Search services" className="h-11 rounded-xl border border-line bg-surface px-3" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category" className="h-11 rounded-xl border border-line bg-surface px-3">
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.id} to="/portal/services/$serviceId" params={{ serviceId: String(item.id) }} className="grid gap-1 rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{item.category}</p>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-sm text-muted">{item.summary}</p>
          </Link>
        ))}
      </div>
      {catalog.data && items.length === 0 ? <p className="text-sm text-muted">Nothing matches that search.</p> : null}
    </div>
  );
}
