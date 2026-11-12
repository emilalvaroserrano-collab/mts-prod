import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { listDeskAccounts, listPortalCustomers, setDeskRole, setPortalGrants } from "@/lib/portal/api";
import { ErrorNote, Loading, PageHeader, Panel, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/access")({
  component: AccessPage,
});

export function AccessPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["portal-customers"], queryFn: () => listPortalCustomers() });
  const accounts = useQuery({ queryKey: ["desk-accounts"], queryFn: () => listDeskAccounts() });
  const save = useMutation({
    mutationFn: setPortalGrants,
    onSuccess: () => {
      toast.success("Access saved");
      void client.invalidateQueries({ queryKey: ["portal-customers"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const desk = useMutation({
    mutationFn: (input: { userId: string; role: string }) => setDeskRole({ data: input }),
    onSuccess: () => {
      toast.success("Desk role saved");
      void client.invalidateQueries({ queryKey: ["desk-accounts"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Customers"
        title="Customer access"
        description="New sign-ins are customers. Grant the shop or an invoice here, and only then give someone a desk role."
      />
      <Panel className="grid gap-3">
        <h2 className="text-sm font-semibold">Desk access</h2>
        <p className="text-xs text-muted">Customer is the default. Admin, agent, and owner are set from here.</p>
        <div className="grid gap-2">
          {(accounts.data ?? []).map((account) => (
            <label key={account.id} className="grid gap-2 rounded-xl border border-line px-3 py-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{account.name || account.email}</span>
                <span className="block truncate text-xs text-muted">{account.email}</span>
              </span>
              <select
                aria-label={`Desk role for ${account.email}`}
                className="h-10 rounded-xl border border-line px-2 text-sm"
                value={account.role}
                onChange={(event) => desk.mutate({ userId: account.id, role: event.target.value })}
              >
                <option value="customer">Customer</option>
                <option value="viewer">Viewer</option>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          ))}
          {accounts.data && accounts.data.length === 0 ? <p className="text-sm text-muted">No one has registered yet.</p> : null}
        </div>
      </Panel>
      <div className="grid gap-3">
        {query.data.map((person) => (
          <Panel key={person.id} className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{person.name || person.email}</h2>
                <p className="truncate text-xs text-muted">{person.email} · {person.organization || person.business || "No company"}</p>
                <p className="mt-1 text-xs text-muted">{person.verified ? "Email verified" : "Email not verified"}{person.interests ? ` · ${person.interests}` : ""}</p>
              </div>
              <p className="text-xs font-semibold uppercase text-accent">{person.roleId}</p>
            </div>
            <form
              className="flex flex-wrap items-center gap-3 text-sm"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                save.mutate({
                  data: {
                    id: person.id,
                    shop: data.get("shop") === "on",
                    services: data.get("services") === "on",
                    invoice: data.get("invoice") === "on",
                  },
                });
              }}
            >
              <label className="flex items-center gap-2"><input type="checkbox" name="shop" defaultChecked={person.shop} /> Shop</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="services" defaultChecked={person.services} /> Services</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="invoice" defaultChecked={person.invoice} /> Invoice</label>
              <button type="submit" className="h-9 rounded-full bg-ink px-4 text-xs font-semibold text-white">Save</button>
            </form>
          </Panel>
        ))}
      </div>
    </div>
  );
}
