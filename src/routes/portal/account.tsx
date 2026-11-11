import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { saveShopProfile } from "@/lib/portal/api";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useShopToken } from "@/lib/portal/shop-session";
import { DataField, PortalPanel } from "@/components/portal-ui";
import { Field, Input } from "@/components/ui";

export const Route = createFileRoute("/portal/account")({
  component: AccountPage,
});

export function AccountPage() {
  const token = useShopToken();
  const session = usePortalSession();
  const user = useCurrentUser();
  const customer = session.data?.customer;
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [city, setCity] = useState(customer?.city || "");
  const [region, setRegion] = useState(customer?.region || "");
  const [postal, setPostal] = useState(customer?.postal || "");
  const [country, setCountry] = useState(customer?.country || "United States");
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: () => saveShopProfile({ data: { token, name, phone, address, city, region, postal, country } }),
    onSuccess: () => setNotice("Account saved."),
    onError: (error) => setNotice(error instanceof Error ? error.message : "Could not save."),
  });
  return (
    <form className="grid w-full gap-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-medium tracking-tight">Account</h1>
        <p className="text-sm text-muted">Password changes stay with the sign-in provider you used.</p>
      </div>
      <PortalPanel title="Profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <DataField label="Email" value={user?.primaryEmail || customer?.email} />
          <DataField label="Company" value={session.data?.organization || session.data?.business} />
          <DataField label="Role" value={session.data?.access.roleLabel} />
          <DataField label="Billing terms" value={customer?.payLater ? "Order now, pay later" : "Pay at checkout"} />
        </div>
      </PortalPanel>
      <PortalPanel title="Contact and billing">
        <div className="grid gap-3">
          <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} required className="h-11 rounded-xl" /></Field>
          <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-xl" /></Field>
          <Field label="Billing address"><Input value={address} onChange={(event) => setAddress(event.target.value)} className="h-11 rounded-xl" /></Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl" /></Field>
            <Field label="State"><Input value={region} onChange={(event) => setRegion(event.target.value)} className="h-11 rounded-xl" /></Field>
            <Field label="Postal code"><Input value={postal} onChange={(event) => setPostal(event.target.value)} className="h-11 rounded-xl" /></Field>
            <Field label="Country"><Input value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 rounded-xl" /></Field>
          </div>
        </div>
      </PortalPanel>
      {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      <button type="submit" disabled={save.isPending} className="h-11 rounded-xl bg-ink text-sm font-medium text-white disabled:opacity-50">Save account</button>
    </form>
  );
}
