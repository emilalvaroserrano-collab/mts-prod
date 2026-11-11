import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { savePortalCompany } from "@/lib/portal/api";
import { useShopToken } from "@/lib/portal/shop-session";
import { DataField, PortalPanel } from "@/components/portal-ui";
import { Field, Input } from "@/components/ui";

export const Route = createFileRoute("/portal/organization")({
  component: OrganizationPage,
});

export function OrganizationPage() {
  const token = useShopToken();
  const client = useQueryClient();
  const session = usePortalSession();
  const [business, setBusiness] = useState(session.data?.business || session.data?.organization || "");
  const [phone, setPhone] = useState(session.data?.customer.phone || "");
  const [city, setCity] = useState(session.data?.customer.city || "");
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: () => savePortalCompany({ data: { token, business, phone, city } }),
    onSuccess: () => {
      setNotice("Saved. A ticket was opened so the desk can review the change.");
      void client.invalidateQueries({ queryKey: ["portal-session", token] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not save."),
  });
  return (
    <form className="grid w-full gap-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-medium tracking-tight">My organization</h1>
        <p className="text-sm text-muted">You only see this company. Saving a change opens a ticket for review.</p>
      </div>
      <PortalPanel>
        <div className="grid grid-cols-2 gap-3">
          <DataField label="Signed in as" value={session.data?.customer.email} />
          <DataField label="Role" value={session.data?.access.roleLabel} />
        </div>
      </PortalPanel>
      <PortalPanel title="Company">
        <div className="grid gap-3">
          <Field label="Company name"><Input value={business} onChange={(event) => setBusiness(event.target.value)} required className="h-11 rounded-xl" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-xl" /></Field>
            <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl" /></Field>
          </div>
        </div>
      </PortalPanel>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      <button type="submit" disabled={save.isPending} className="h-11 rounded-xl bg-ink text-sm font-medium text-white disabled:opacity-50">Save company</button>
    </form>
  );
}
