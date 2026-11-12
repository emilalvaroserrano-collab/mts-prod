import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getOrg, saveOrg } from "@/lib/portal/api";
import type { Org } from "@/lib/portal/types";
import { ago, money } from "@/lib/portal/format";
import { ticketSearch } from "@/lib/portal/ticket-search";
import { Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, StatusBadge, Textarea, Toggle, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/organizations/$orgId")({
  component: CompanyPage,
});

export function CompanyPage() {
  const { orgId = "" } = useParams({ strict: false });
  const id = Number(orgId);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["org", id], queryFn: () => getOrg({ data: id }) });
  const [form, setForm] = useState<Org | null>(null);
  useEffect(() => {
    if (query.data) setForm(query.data.org);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("Missing company.");
      return saveOrg({ data: form });
    },
    onSuccess: () => {
      toast.success("Company saved");
      client.invalidateQueries({ queryKey: ["org", id] });
      client.invalidateQueries({ queryKey: ["orgs"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  if (query.isPending || !form) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const detail = query.data;

  function patch(partial: Partial<Org>) {
    setForm((current) => (current ? { ...current, ...partial } : current));
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow={form.industry || "Company"}
        title={form.name}
        description={form.domain || "No domain on file"}
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving" : "Save company"}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(event) => patch({ name: event.target.value })} />
            </Field>
            <Field label="Domain names">
              <Input value={form.domain} onChange={(event) => patch({ domain: event.target.value })} />
            </Field>
            <Field label="Details">
              <Input value={form.details || form.industry} onChange={(event) => patch({ details: event.target.value, industry: event.target.value })} />
            </Field>
            <Field label="Tags">
              <Input value={form.tags} onChange={(event) => patch({ tags: event.target.value })} placeholder="vip, portal" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(event) => patch({ phone: event.target.value })} />
            </Field>
            <Field label="External ID">
              <Input value={form.zendeskOrgId} onChange={(event) => patch({ zendeskOrgId: event.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(event) => patch({ address: event.target.value })} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(event) => patch({ notes: event.target.value })} />
            </Field>
          </div>
        </Panel>
        <div className="grid gap-3 content-start">
          <Toggle checked={form.portalAccess} onCheckedChange={(portalAccess) => patch({ portalAccess })} label="Portal access" />
          <Toggle checked={form.orderingEnabled} onCheckedChange={(orderingEnabled) => patch({ orderingEnabled })} label="Catalog ordering" />
          <Toggle checked={form.userRequestsEnabled} onCheckedChange={(userRequestsEnabled) => patch({ userRequestsEnabled })} label="User requests" />
          <Toggle checked={form.approvalRequired} onCheckedChange={(approvalRequired) => patch({ approvalRequired })} label="Order approval required" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <h2 className="text-sm font-semibold">People</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.people.map((person) => (
              <li key={person.id} className="py-2">
                <p className="font-medium">{person.name}</p>
                <p className="text-xs text-muted">{person.permissionLevel} · {person.email}</p>
              </li>
            ))}
            {detail.people.length === 0 ? <li className="py-2 text-muted">No people yet.</li> : null}
          </ul>
          <Link to="/users" className="mt-3 inline-block text-sm text-accent">Manage people</Link>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Tickets</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.tickets.map((ticket) => (
              <li key={ticket.id} className="py-2">
                <Link to="/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="font-medium hover:underline">
                  {ticket.subject}
                </Link>
                <p className="text-xs text-muted">{ticket.status} · {ago(ticket.updatedAt)}</p>
              </li>
            ))}
          </ul>
          <Link to="/tickets" search={ticketSearch({ org: String(form.id), status: "all" })} className="mt-3 inline-block text-sm text-accent">
            Company tickets
          </Link>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Orders</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-2 py-2">
                <Link to="/orders/$orderId" params={{ orderId: String(order.id) }} className="font-medium hover:underline">
                  {order.number}
                </Link>
                <span className="text-xs text-muted">{money(order.totalCents)}</span>
              </li>
            ))}
            {detail.orders.length === 0 ? <li className="py-2 text-muted">No orders yet.</li> : null}
          </ul>
          <StatusBadge value={form.orderingEnabled ? "ordering on" : "ordering off"} />
        </Panel>
      </div>
    </div>
  );
}
