import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSettings, saveResend, saveSettings, saveStaff, sendTestEmail, testResend } from "@/lib/portal/api";
import type { PortalSettings, Role, Staff } from "@/lib/portal/types";
import { ago } from "@/lib/portal/format";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Textarea, Toggle, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const ROLE_LABEL: Record<Role, string> = {
  owner: "Super Admin",
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

export function SettingsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [fromEmail, setFromEmail] = useState("noreply@managetechservice.com");
  const [apiKey, setApiKey] = useState("");
  const [testTo, setTestTo] = useState("");
  const { user } = useCurrentUserState();

  useEffect(() => {
    if (!query.data) return;
    setSettings(query.data.settings);
    setStaff(query.data.staff);
    setFromEmail(query.data.mail.fromEmail || "noreply@managetechservice.com");
    setApiKey("");
  }, [query.data]);

  useEffect(() => {
    const email = user?.primaryEmail;
    if (email) setTestTo((current) => current || email);
  }, [user]);

  const save = useMutation({
    mutationFn: (next: PortalSettings) => saveSettings({ data: next }),
    onSuccess: (result) => {
      toast.success(result.zendeskWarning ? "Saved here. Zendesk did not take the signature yet." : "Portal settings saved");
      if (result.zendeskWarning) toast.error(result.zendeskWarning);
      client.invalidateQueries({ queryKey: ["settings"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const mailSave = useMutation({
    mutationFn: () => saveResend({ data: { fromEmail, apiKey } }),
    onSuccess: () => {
      toast.success("Resend saved");
      setApiKey("");
      client.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const mailTest = useMutation({
    mutationFn: () => testResend(),
    onSuccess: (result) => {
      toast.success(result.message);
      client.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const mailSend = useMutation({
    mutationFn: () => sendTestEmail({ data: { to: testTo } }),
    onSuccess: () => {
      toast.success(`Test email sent to ${testTo}`);
      client.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const staffSave = useMutation({
    mutationFn: (member: Staff) =>
      saveStaff({
        data: {
          userId: member.userId,
          role: member.role,
          active: member.active,
          organizationId: member.organizationId,
        },
      }),
    onSuccess: () => {
      toast.success("Staff access updated");
      client.invalidateQueries({ queryKey: ["settings"] });
      client.invalidateQueries({ queryKey: ["shell"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  if (query.isPending || !settings) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;

  function patchStaff(userId: string, next: Partial<Staff>) {
    setStaff((current) => current.map((member) => (member.userId === userId ? { ...member, ...next } : member)));
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Desk"
        title="Settings"
        description="Branding, Resend email, who on staff can see which companies, and the record of changes."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="text-sm font-semibold">Branding</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(settings);
            }}
          >
            <Field label="Name">
              <Input value={settings.brandName} onChange={(event) => setSettings({ ...settings, brandName: event.target.value })} required />
            </Field>
            <Field label="Support email">
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}
              />
            </Field>
            <Field label="Tagline">
              <Input value={settings.tagline} onChange={(event) => setSettings({ ...settings, tagline: event.target.value })} />
            </Field>
            <Field label="Ticket reply name" hint="Shown on public support replies instead of Zendesk.">
              <Input value={settings.replyName} onChange={(event) => setSettings({ ...settings, replyName: event.target.value })} required />
            </Field>
            <Field label="Email signature" hint="Used on ticket emails, agent replies, and mail sent from this portal. {{agent.name}} becomes the person who replies.">
              <Textarea value={settings.emailSignature} onChange={(event) => setSettings({ ...settings, emailSignature: event.target.value })} rows={6} />
            </Field>
            <Toggle
              checked={settings.notifyNewTicket}
              onCheckedChange={(notifyNewTicket) => setSettings({ ...settings, notifyNewTicket })}
              label="Note new tickets in the activity log"
            />
            <Toggle
              checked={settings.notifyNewOrder}
              onCheckedChange={(notifyNewOrder) => setSettings({ ...settings, notifyNewOrder })}
              label="Note new orders in the activity log"
            />
            <Toggle
              checked={settings.customerCatalogVisible}
              onCheckedChange={(customerCatalogVisible) => setSettings({ ...settings, customerCatalogVisible })}
              label="Show the catalog to customers"
            />
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving" : "Save settings"}
            </Button>
          </form>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Activity</h2>
          <ul className="mt-3 divide-y divide-line">
            {query.data.audit.length === 0 ? <li className="py-3 text-sm text-muted">No changes yet.</li> : null}
            {query.data.audit.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-sm">
                  <span className="font-medium">{entry.actorName || "Desk"}</span> {entry.action.toLowerCase()}{" "}
                  <span className="font-medium">{entry.target}</span>
                </p>
                {entry.detail ? <p className="mt-1 text-xs text-muted">{entry.detail}</p> : null}
                <p className="mt-1 text-xs text-muted">{ago(entry.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <h2 className="text-sm font-semibold">Resend</h2>
          <span className="text-xs font-medium text-muted">
            {query.data.mail.keySet ? "API key saved" : "No API key yet"}
            {query.data.mail.status === "connected" ? " · Connected" : ""}
            {query.data.mail.status === "error" ? " · Needs attention" : ""}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">Order and account mail is sent from the noreply address. Leave the key blank to keep the one already saved.</p>
        {query.data.mail.error ? <p className="mt-2 text-xs text-muted">{query.data.mail.error}</p> : null}
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            mailSave.mutate();
          }}
        >
          <Field label="From address">
            <Input type="email" value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} required />
          </Field>
          <Field label="Resend API key" hint={query.data.mail.keySet ? "A key is already saved." : "Paste the key from Resend."}>
            <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder={query.data.mail.keySet ? "••••••••" : "re_..."} />
          </Field>
          <Field label="Send a test to">
            <Input type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="you@company.com" />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={mailSave.isPending}>
              {mailSave.isPending ? "Saving" : "Save Resend"}
            </Button>
            <Button type="button" variant="secondary" disabled={mailTest.isPending} onClick={() => mailTest.mutate()}>
              {mailTest.isPending ? "Testing" : "Test connection"}
            </Button>
            <Button type="button" variant="secondary" disabled={mailSend.isPending || !testTo.includes("@")} onClick={() => mailSend.mutate()}>
              {mailSend.isPending ? "Sending" : "Send test email"}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel>
        <h2 className="text-sm font-semibold">Staff</h2>
        <p className="mt-1 text-sm text-muted">A company limit hides every other organization. Leave it open for the whole desk. Super Admin is the only role that can delete an order.</p>
        <ul className="mt-4 grid gap-4">
          {staff.map((member) => (
            <li key={member.userId} className="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium">{member.name || member.email}</p>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role">
                  <Select value={member.role} onChange={(event) => patchStaff(member.userId, { role: event.target.value as Role })}>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Company limit">
                  <Select
                    value={member.organizationId ?? ""}
                    onChange={(event) =>
                      patchStaff(member.userId, { organizationId: event.target.value ? Number(event.target.value) : null })
                    }
                  >
                    <option value="">All companies</option>
                    {query.data.orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Toggle checked={member.active} onCheckedChange={(active) => patchStaff(member.userId, { active })} label="Account active" />
              <div>
                <Button type="button" size="sm" variant="secondary" disabled={staffSave.isPending} onClick={() => staffSave.mutate(member)}>
                  Save access
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
