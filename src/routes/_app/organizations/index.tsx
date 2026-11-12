import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { listOrgs, saveOrg } from "@/lib/portal/api";
import { day } from "@/lib/portal/format";
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Textarea, ViewSwitch, errorText, useViewMode } from "@/components/ui";

export const Route = createFileRoute("/_app/organizations/")({
  component: CompaniesPage,
});

export function CompaniesPage() {
  const query = useQuery({ queryKey: ["orgs"], queryFn: () => listOrgs() });
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useViewMode("mts-companies-view");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      saveOrg({
        data: {
          name,
          domain,
          industry,
          phone,
          address: "",
          zendeskOrgId: "",
          notes,
          portalAccess: true,
          orderingEnabled: true,
          userRequestsEnabled: true,
          approvalRequired: true,
        },
      }),
    onSuccess: (result) => {
      toast.success("Company added");
      client.invalidateQueries({ queryKey: ["orgs"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      client.invalidateQueries({ queryKey: ["shell"] });
      setOpen(false);
      navigate({ to: "/organizations/$orgId", params: { orgId: String(result.id) } });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Customers"
        title="Companies"
        description="Profiles, Zendesk organizations, and who is allowed to order."
        actions={<Button onClick={() => setOpen(true)}>Add company</Button>}
      />
      <div className="flex justify-center md:justify-end">
        <ViewSwitch mode={layout} onChange={setLayout} />
      </div>
      {query.isPending ? <Loading /> : null}
      {query.isError ? <ErrorNote message={query.error.message} /> : null}
      {query.data && query.data.length === 0 ? <Empty title="No companies" body="Add the first customer organization." /> : null}
      {query.data && query.data.length > 0 ? (
        layout === "grid" ? (
          <div className="grid justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch xl:grid-cols-3">
            {query.data.map((org) => (
              <Link key={org.id} to="/organizations/$orgId" params={{ orgId: String(org.id) }} className="grid w-full max-w-md justify-items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center sm:max-w-none sm:justify-items-start sm:text-left">
                <p className="text-base font-semibold">{org.name}</p>
                <p className="text-xs text-muted">{org.industry || "No industry"}</p>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge tone={org.portalAccess ? "good" : "neutral"}>{org.portalAccess ? "Portal on" : "Portal off"}</Badge>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 text-center text-xs text-muted">
                  <p className="rounded-xl bg-bg px-2 py-2">{org.userCount} people</p>
                  <p className="rounded-xl bg-bg px-2 py-2">{org.openTickets} open tickets</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
        <>
        <ul className="grid gap-2 md:hidden">
          {query.data.map((org) => (
            <li key={org.id}>
              <Link to="/organizations/$orgId" params={{ orgId: String(org.id) }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span>
                  <span className="block font-semibold">{org.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{org.userCount} people · {org.openTickets} tickets</span>
                </span>
                <Badge tone={org.portalAccess ? "good" : "neutral"}>{org.portalAccess ? "On" : "Off"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Domains</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">External ID</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((org) => (
                <tr key={org.id} className="border-t border-line">
                  <td className="px-4 py-3" data-label="Name">
                    <Link to="/organizations/$orgId" params={{ orgId: String(org.id) }} className="font-medium hover:underline">
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3" data-label="Domains">{org.domain || "—"}</td>
                  <td className="px-4 py-3" data-label="Details">{org.industry || org.notes || "—"}</td>
                  <td className="px-4 py-3 text-muted" data-label="Created">{org.createdAt ? day(org.createdAt) : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs" data-label="External ID">{org.zendeskOrgId || "—"}</td>
                  <td className="px-4 py-3 tabular-nums" data-label="Users">{org.userCount}</td>
                  <td className="px-4 py-3" data-label="Tickets">
                    <span className="tabular-nums">{org.openTickets}</span>
                    <Badge tone={org.portalAccess ? "good" : "neutral"}>{org.portalAccess ? "Shared" : "Private"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )
      ) : null}
      <Modal open={open} onOpenChange={setOpen} title="Add organization" description="Same fields Zendesk stores on an organization.">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Domain names">
            <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="company.example" />
          </Field>
          <Field label="Details">
            <Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Industry" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving" : "Create organization"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
