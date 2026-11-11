import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getPeople, reviewRequest, saveCustomer, setShopPayLater, setShopRole, syncPortalUsers } from "@/lib/portal/api";
import type { Customer, Policy } from "@/lib/portal/types";
import { ago, day } from "@/lib/portal/format";
import { Badge, Button, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Select, StatusBadge, Toggle, ViewSwitch, errorText, useViewMode } from "@/components/ui";

export const Route = createFileRoute("/_app/users")({
  component: PeoplePage,
});

const blank = (): Customer => ({
  id: 0,
  organizationId: null,
  organizationName: "",
  name: "",
  email: "",
  title: "",
  permissionLevel: "regular",
  canOrder: false,
  canRequestUsers: false,
  canApproveOrders: false,
  active: true,
  zendeskUserId: "",
  createdAt: "",
  source: "company",
  staffUserId: "",
  phone: "",
  orderCount: 0,
  lastOrderId: null,
  lastOrderStatus: "",
  ticketId: null,
  zendeskTicketId: "",
  payLater: false,
});

function PeoplePage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["people"], queryFn: () => getPeople() });
  const [draft, setDraft] = useState<Customer | null>(null);
  const [view, setView] = useState("all");
  const [layout, setLayout] = useViewMode("mts-people-view");
  const [search, setSearch] = useState("");
  const save = useMutation({
    mutationFn: (person: Customer) =>
      saveCustomer({
        data: {
          id: person.id || undefined,
          organizationId: person.organizationId,
          name: person.name,
          email: person.email,
          title: person.title,
          permissionLevel: person.permissionLevel,
          canOrder: person.canOrder,
          canRequestUsers: person.canRequestUsers,
          canApproveOrders: person.canApproveOrders,
          active: person.active,
          zendeskUserId: person.zendeskUserId,
        },
      }),
    onSuccess: (result) => {
      toast.success(result.zendeskId ? `Person saved. Zendesk ticket ${result.zendeskId}` : "Person saved");
      if (result.warning) toast.message(result.warning);
      setDraft(null);
      client.invalidateQueries({ queryKey: ["people"] });
      client.invalidateQueries({ queryKey: ["shell"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const role = useMutation({
    mutationFn: (input: { id: number; roleId: string }) => setShopRole({ data: input }),
    onSuccess: () => {
      toast.success("Customer role updated");
      client.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const payLater = useMutation({
    mutationFn: (input: { id: number; payLater: boolean }) => setShopPayLater({ data: input }),
    onSuccess: () => {
      toast.success("Checkout rule updated");
      client.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const review = useMutation({
    mutationFn: (input: { id: number; decision: "approved" | "denied" }) => reviewRequest({ data: input }),
    onSuccess: (result) => {
      toast.success(result.zendeskId ? `Request reviewed. Zendesk ticket ${result.zendeskId}` : "Request reviewed");
      if (result.warning) toast.message(result.warning);
      client.invalidateQueries({ queryKey: ["people"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const syncUsers = useMutation({
    mutationFn: () => syncPortalUsers(),
    onSuccess: (result) => {
      toast.success(result.failed ? `Synced ${result.synced}. ${result.failed} failed.` : `Synced ${result.synced} users to Zendesk`);
      client.invalidateQueries({ queryKey: ["people"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const pending = query.data.requests.filter((request) => request.status === "pending");
  const needle = search.trim().toLowerCase();
  const people = query.data.people.filter((person) => {
    if (view === "active" && !person.active) return false;
    if (view === "inactive" && person.active) return false;
    if (view === "order" && !person.canOrder) return false;
    if (view === "approve" && !person.canApproveOrders) return false;
    if (view === "shop" && person.source !== "shop") return false;
    if (view === "portal" && person.source !== "portal") return false;
    if (view === "company" && person.source !== "company") return false;
    if (!needle) return true;
    return [person.name, person.email, person.organizationName, person.title, person.phone].join(" ").toLowerCase().includes(needle);
  });

  function applyPolicy(level: string) {
    const policy = query.data?.policies.find((item) => item.id === level);
    setDraft((current) =>
      current
        ? {
            ...current,
            permissionLevel: level,
            canOrder: policy?.canOrder ?? current.canOrder,
            canRequestUsers: policy?.canRequestUsers ?? current.canRequestUsers,
            canApproveOrders: policy?.canApproveOrders ?? current.canApproveOrders,
          }
        : current,
    );
  }

  function addShopPerson(person: Customer) {
    setDraft({
      ...blank(),
      name: person.name,
      email: person.email,
      title: "Online shop",
      phone: person.phone,
      organizationId: query.data?.orgs[0]?.id ?? null,
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Directory"
        title="People"
        description="Company users and online shop customers, with their orders and Zendesk ticket."
        actions={
          <>
            <Button variant="secondary" disabled={syncUsers.isPending} onClick={() => syncUsers.mutate()}>
              {syncUsers.isPending ? "Syncing" : "Sync to Zendesk"}
            </Button>
            <Button onClick={() => setDraft({ ...blank(), organizationId: query.data.orgs[0]?.id ?? null })}>Add person</Button>
          </>
        }
      />
      <div className="grid justify-items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:justify-items-stretch">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or company" aria-label="Search people" className="sm:max-w-xs" />
        <div className="flex gap-2 overflow-x-auto">
          {[
            ["all", "All"],
            ["company", "Company"],
            ["shop", "Shop"],
            ["portal", "Portal"],
            ["active", "Active"],
            ["inactive", "Inactive"],
            ["order", "Can order"],
            ["approve", "Approvers"],
            ["requests", "Requests"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={view === id ? "h-8 shrink-0 rounded-full bg-ink px-3 text-[13px] font-semibold text-white" : "h-8 shrink-0 rounded-full border border-line px-3 text-[13px] text-muted"}
            >
              {label}
              {id === "requests" && pending.length > 0 ? ` ${pending.length}` : ""}
            </button>
          ))}
        </div>
        <ViewSwitch mode={layout} onChange={setLayout} />
      </div>
      {view === "requests" || pending.length > 0 ? (
        <Panel>
          <h2 className="text-sm font-semibold">{view === "requests" ? "Account requests" : "Requests waiting"}</h2>
          <ul className="mt-3 divide-y divide-line">
            {(view === "requests" ? query.data.requests : pending).map((request) => (
              <li key={request.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{request.requestedName}</p>
                  <p className="text-xs text-muted">
                    {request.requestedEmail} · {request.organizationName || "No company"} · asked by {request.requestedBy || "unknown"} · {ago(request.createdAt)}
                  </p>
                </div>
                {request.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review.mutate({ id: request.id, decision: "approved" })}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => review.mutate({ id: request.id, decision: "denied" })}>Deny</Button>
                  </div>
                ) : (
                  <StatusBadge value={request.status} />
                )}
              </li>
            ))}
            {(view === "requests" ? query.data.requests : pending).length === 0 ? <li className="py-3 text-sm text-muted">No requests.</li> : null}
          </ul>
        </Panel>
      ) : null}
      {view !== "requests" ? (
        <>
        {layout === "grid" ? (
          <div className="grid justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch xl:grid-cols-3">
            {people.map((person) => (
              <article key={`${person.source}-${person.staffUserId || person.id}`} className="grid w-full max-w-md justify-items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center sm:max-w-none sm:justify-items-start sm:text-left">
                <p className="font-semibold">{person.name || person.email}</p>
                <p className="text-xs text-muted">{person.email}</p>
                <p className="text-xs text-muted">{person.source === "shop" ? "Online shop" : person.organizationName || "No company"} · {person.orderCount} orders</p>
                {person.source === "shop" ? <p className="text-xs font-medium">{person.payLater ? "Order now, pay later" : "Pays at checkout"}</p> : null}
                {person.source === "shop" ? <Button size="sm" variant="secondary" onClick={() => addShopPerson(person)}>Add to company</Button> : person.source === "portal" ? <span className="text-xs text-muted">Staff account</span> : <Button size="sm" variant="secondary" onClick={() => setDraft(person)}>Edit</Button>}
                {person.source === "shop" ? (
                  <Button size="sm" variant="secondary" onClick={() => payLater.mutate({ id: person.id, payLater: !person.payLater })}>
                    {person.payLater ? "Require payment" : "Allow pay later"}
                  </Button>
                ) : null}
              </article>
            ))}
            {people.length === 0 ? <p className="text-sm text-muted">No one matches that view.</p> : null}
          </div>
        ) : (
          <ul className="grid gap-2 md:hidden">
            {people.map((person) => (
              <li key={`${person.source}-${person.staffUserId || person.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span>
                  <span className="block font-semibold">{person.name || person.email}</span>
                  <span className="mt-0.5 block text-xs text-muted">{person.email}</span>
                </span>
                {person.source === "shop" ? <Button size="sm" variant="secondary" onClick={() => addShopPerson(person)}>Add</Button> : person.source === "portal" ? <span className="text-xs text-muted">Staff</span> : <Button size="sm" variant="secondary" onClick={() => setDraft(person)}>Edit</Button>}
              </li>
            ))}
          </ul>
        )}
        <div className={layout === "list" ? "hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block" : "hidden"}>
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">External ID</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={`${person.source}-${person.staffUserId || person.id}`} className="border-t border-line">
                  <td className="px-4 py-3 font-medium" data-label="Name">{person.name || "—"}</td>
                  <td className="px-4 py-3" data-label="Email">{person.email || "—"}</td>
                  <td className="px-4 py-3" data-label="Organization">{person.source === "shop" ? "Online shop" : person.organizationName || "—"}</td>
                  <td className="px-4 py-3" data-label="Role">
                    <div className="flex flex-wrap justify-end gap-1 sm:justify-start">
                      {person.source === "shop" ? (
                        <select
                          aria-label={`Role for ${person.email}`}
                          className="h-8 rounded-lg border border-line bg-white px-2 text-xs"
                          value={["regular", "buyer", "authorized"].includes(person.permissionLevel) ? person.permissionLevel : "regular"}
                          onChange={(event) => role.mutate({ id: person.id, roleId: event.target.value })}
                        >
                          <option value="regular">end-user</option>
                          <option value="buyer">end-user · shop</option>
                          <option value="authorized">end-user · account</option>
                        </select>
                      ) : <Badge tone={person.permissionLevel === "authorized" ? "pine" : "neutral"}>{person.source === "portal" ? "agent" : "end-user"}</Badge>}
                      <StatusBadge value={person.active ? "active" : "inactive"} />
                    </div>
                  </td>
                  <td className="px-4 py-3" data-label="Phone">{person.phone || "—"}</td>
                  <td className="px-4 py-3" data-label="External ID">
                    {person.zendeskUserId ? person.zendeskUserId : person.ticketId ? (
                      <Link to="/tickets/$ticketId" params={{ ticketId: String(person.ticketId) }} className="text-accent hover:underline">
                        {person.zendeskTicketId ? `#${person.zendeskTicketId}` : `P-${person.ticketId}`}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted" data-label="Created">{person.createdAt ? day(person.createdAt) : "—"}</td>
                  <td className="px-4 py-3 text-right" data-label="Action">
                    {person.source === "shop" ? (
                      <Button size="sm" variant="secondary" onClick={() => addShopPerson(person)}>Add to company</Button>
                    ) : person.source === "portal" ? (
                      <span className="text-xs text-muted">Staff account</span>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setDraft(person)}>Edit</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {people.length === 0 ? <p className="px-4 py-6 text-sm text-muted">No one matches that view.</p> : null}
        </div>
        </>
      ) : null}
      <Modal
        open={Boolean(draft)}
        onOpenChange={(open) => { if (!open) setDraft(null); }}
        title={draft?.id ? "Edit person" : "Add person"}
        description="Saving a new person opens their Zendesk ticket. Permissions are checked when they order."
      >
        {draft ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(draft);
            }}
          >
            <Field label="Name"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required /></Field>
            <Field label="Title"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
            <Field label="Company">
              <Select
                value={draft.organizationId ?? ""}
                onChange={(event) => setDraft({ ...draft, organizationId: event.target.value ? Number(event.target.value) : null })}
              >
                <option value="">No company</option>
                {query.data.orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </Select>
            </Field>
            <Field label="Permission level">
              <Select value={draft.permissionLevel} onChange={(event) => applyPolicy(event.target.value)}>
                <option value="regular">Regular customer</option>
                <option value="authorized">Authorized customer</option>
              </Select>
            </Field>
            <Field label="Zendesk user id" hint="Requester id from Zendesk, when you have one.">
              <Input value={draft.zendeskUserId} onChange={(event) => setDraft({ ...draft, zendeskUserId: event.target.value })} />
            </Field>
            <Toggle checked={draft.canOrder} onCheckedChange={(canOrder) => setDraft({ ...draft, canOrder })} label="Can order products" />
            <Toggle checked={draft.canRequestUsers} onCheckedChange={(canRequestUsers) => setDraft({ ...draft, canRequestUsers })} label="Can request users" />
            <Toggle checked={draft.canApproveOrders} onCheckedChange={(canApproveOrders) => setDraft({ ...draft, canApproveOrders })} label="Can approve orders" />
            <Toggle checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} label="Account active" />
            <PolicyHint policies={query.data.policies} />
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving" : "Save person"}</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function PolicyHint({ policies }: { policies: Policy[] }) {
  return (
    <p className="text-xs text-muted">
      Templates: {policies.filter((policy) => policy.id === "regular" || policy.id === "authorized").map((policy) => policy.label).join(" and ") || "set on the Roles page"}.
    </p>
  );
}