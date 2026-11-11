import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { getService, requestPortalService } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";

export const Route = createFileRoute("/portal/services/$serviceId")({
  component: ServiceDetail,
});

export function ServiceDetail() {
  const { serviceId = "" } = useParams({ strict: false });
  const id = Number(serviceId);
  const token = useShopToken();
  const client = useQueryClient();
  const session = usePortalSession();
  const service = useQuery({ queryKey: ["service", id], queryFn: () => getService({ data: id }), enabled: Number.isFinite(id) });
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [extra, setExtra] = useState("");
  const [notice, setNotice] = useState("");
  const send = useMutation({
    mutationFn: () => requestPortalService({ data: { token, serviceId: id, details: [details, extra].filter(Boolean).join("\n"), severity } }),
    onSuccess: () => {
      setNotice("Request sent. A ticket is open and nothing is billed until the desk quotes it.");
      setDetails("");
      void client.invalidateQueries({ queryKey: ["portal-services", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not send the request."),
  });
  const item = service.data;
  if (service.isPending) return <p className="text-sm text-muted">Opening the service…</p>;
  if (!item) return <p className="text-sm text-muted">That service is not in the catalog.</p>;
  const access = session.data?.access;
  const allowed = item.kind === "phone" ? access?.canOrderPhone : access?.canOrderIt;
  const phone = item.kind === "phone";

  return (
    <div className="grid w-full gap-4">
      <Link to="/portal/services" className="text-sm text-muted">All services</Link>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{item.category}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{item.name}</h1>
        <p className="mt-2 text-sm text-muted">{item.summary}</p>
      </div>
      {item.benefits ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"><span className="font-semibold">Why it helps. </span>{item.benefits}</p> : null}
      {item.scope ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"><span className="font-semibold">In scope. </span>{item.scope}</p> : null}
      <p className="text-sm text-muted">Price is quoted. This page does not promise a rate or a start date.</p>
      {allowed ? (
        <form
          className="grid gap-3 rounded-xl border border-line bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice("");
            send.mutate();
          }}
        >
          <h2 className="text-sm font-semibold">Request this service</h2>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Priority" className="h-11 rounded-xl border border-line px-3">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
          {phone ? (
            <textarea value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="Users or extensions, site address, current provider, and the speed or handsets you need." className="min-h-24 rounded-xl border border-line px-3 py-3" />
          ) : (
            <textarea value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="Sites, users, and what should be in the quote." className="min-h-24 rounded-xl border border-line px-3 py-3" />
          )}
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} required placeholder="What do you need done?" className="min-h-24 rounded-xl border border-line px-3 py-3" />
          <button type="submit" disabled={send.isPending} className="h-11 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">{send.isPending ? "Sending" : "Request a quote"}</button>
        </form>
      ) : (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">An admin has to approve service ordering before this account can request {item.name}.</p>
      )}
      <Link to="/portal/tickets" className="text-sm font-semibold text-accent">Contact support instead</Link>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
    </div>
  );
}
