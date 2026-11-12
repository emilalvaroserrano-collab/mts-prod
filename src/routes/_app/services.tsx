import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { listServiceDesk, setServiceStatus } from "@/lib/portal/api";
import { ErrorNote, Loading, PageHeader, Panel, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/services")({
  component: ServicesDesk,
});

const STATUSES = ["requested", "quoted", "approved", "provisioning", "active", "declined"];

export function ServicesDesk() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["service-desk"], queryFn: () => listServiceDesk() });
  const [note, setNote] = useState<Record<number, string>>({});
  const save = useMutation({
    mutationFn: setServiceStatus,
    onSuccess: () => {
      toast.success("Request updated");
      void client.invalidateQueries({ queryKey: ["service-desk"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Services"
        title="Service requests"
        description="Quotes and provisioning for managed IT, cloud, projects, Microsoft 365, phone, and internet. Hardware stays in the shop."
      />
      <div className="grid gap-3">
        {query.data.length === 0 ? <Panel><p className="text-sm text-muted">No service requests yet.</p></Panel> : null}
        {query.data.map((item) => (
          <Panel key={item.id} className="grid gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{item.serviceName}</h2>
                <p className="text-xs text-muted">{item.category} · {item.customer || item.email} · {item.organization || "No company"}</p>
              </div>
              <p className="text-xs font-semibold uppercase text-accent">{item.status}</p>
            </div>
            <p className="text-sm">{item.details}</p>
            <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <select
                defaultValue={item.status}
                aria-label="Status"
                className="h-10 rounded-xl border border-line px-2 text-sm"
                onChange={(event) => save.mutate({ data: { id: item.id, status: event.target.value, quoteNote: note[item.id] ?? item.quoteNote } })}
              >
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <input
                value={note[item.id] ?? item.quoteNote}
                onChange={(event) => setNote((current) => ({ ...current, [item.id]: event.target.value }))}
                placeholder="Quote or provisioning note"
                className="h-10 rounded-xl border border-line px-3 text-sm"
              />
              <button
                type="button"
                className="h-10 rounded-full bg-ink px-4 text-xs font-semibold text-white"
                onClick={() => save.mutate({ data: { id: item.id, status: item.status, quoteNote: note[item.id] ?? item.quoteNote } })}
              >
                Save note
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
