import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getIntegration, getSarahMetrics, runDeskJobs, saveIntegration, syncPortalUsers, syncZendesk, testIntegration } from "@/lib/portal/api";
import { ago } from "@/lib/portal/format";
import { Badge, Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Toggle, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/integrations")({
  component: IntegrationPage,
});

export function IntegrationPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["integration"], queryFn: () => getIntegration() });
  const sarah = useQuery({ queryKey: ["sarah-metrics"], queryFn: () => getSarahMetrics() });
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthScopes, setOauthScopes] = useState("read write");
  const [clearOauth, setClearOauth] = useState(false);
  const [conversationsAppId, setConversationsAppId] = useState("");
  const [conversationsKeyId, setConversationsKeyId] = useState("");
  const [conversationsSecret, setConversationsSecret] = useState("");
  const [webhookId, setWebhookId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setSubdomain(query.data.subdomain);
    setEmail(query.data.email);
    setApiToken("");
    setClearToken(false);
    setOauthClientId(query.data.oauthClientId);
    setOauthClientSecret("");
    setOauthScopes("read write");
    setClearOauth(false);
    setConversationsAppId(query.data.conversationsAppId);
    setConversationsKeyId(query.data.conversationsKeyId);
    setConversationsSecret("");
    setWebhookId(query.data.webhookId);
    setWebhookSecret("");
  }, [query.data]);

  function refresh() {
    client.invalidateQueries({ queryKey: ["integration"] });
    client.invalidateQueries({ queryKey: ["shell"] });
  }

  const save = useMutation({
    mutationFn: () => saveIntegration({ data: { subdomain, email, apiToken, clearToken, oauthClientId, oauthClientSecret, oauthScopes, clearOauth, conversationsAppId, conversationsKeyId, conversationsSecret, webhookId, webhookSecret } }),
    onSuccess: () => {
      toast.success("Zendesk settings saved");
      setApiToken("");
      refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const test = useMutation({
    mutationFn: () => testIntegration(),
    onSuccess: (result) => {
      toast.success(`Connected as ${result.name}`);
      refresh();
    },
    onError: (error) => {
      toast.error(errorText(error));
      refresh();
    },
  });
  const jobs = useMutation({
    mutationFn: () => runDeskJobs(),
    onSuccess: () => toast.success("Queued jobs ran"),
    onError: (error) => toast.error(errorText(error)),
  });
  const sync = useMutation({
    mutationFn: () => syncZendesk(),
    onSuccess: (result) => {
      toast.success(`Synced ${result.imported} tickets, ${result.users} people, ${result.products ?? 0} products, ${result.orders ?? 0} orders, ${result.payments ?? 0} payments`);
      refresh();
      client.invalidateQueries({ queryKey: ["tickets"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast.error(errorText(error));
      refresh();
    },
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const data = query.data;
  const tone = data.lastStatus === "connected" || data.lastStatus === "ready" ? "good" : data.lastStatus === "error" ? "bad" : "neutral";
  const locked = data.fromEnv;

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Connection"
        title="Zendesk"
        description="One mts-portal Zendesk account for every customer and staff member. Tickets, people, and companies use this connection. It is not tied to the person who is signed in."
      />
      <Panel>
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Sarah actions</p>
          <p className="text-sm text-muted">Open confirmations, checks, and desk reviews. Counts come from the action log, not from what Sarah says.</p>
          <div className="flex flex-wrap gap-2">
            {(sarah.data?.counts.length ? sarah.data.counts : [{ status: "none yet", n: 0 }]).map((item) => (
              <Badge key={item.status} tone={item.status === "manual_review" || item.status === "failed" ? "bad" : item.status === "succeeded" ? "good" : "neutral"}>{item.status} · {item.n}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(sarah.data?.confirmations.length ? sarah.data.confirmations : [{ status: "no quotes", n: 0 }]).map((item) => (
              <Badge key={`quote-${item.status}`} tone={item.status === "accepted" ? "good" : item.status === "expired" ? "bad" : "neutral"}>quote {item.status} · {item.n}</Badge>
            ))}
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Subdomain" hint={locked ? "Taken from ZENDESK_SUBDOMAIN." : "The part before .zendesk.com"}>
              <Input value={subdomain} onChange={(event) => setSubdomain(event.target.value)} placeholder="mts-portal" autoComplete="off" readOnly={locked} />
            </Field>
            <Field label="Agent email" hint={locked ? "Taken from ZENDESK_EMAIL." : undefined}>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" readOnly={locked} />
            </Field>
            <Field
              label="API token"
              hint={
                locked
                  ? "Taken from ZENDESK_API_TOKEN. It stays on the server."
                  : data.tokenSet && !clearToken
                    ? "A token is already stored. Leave this blank to keep it."
                    : "Stored on the server. It is not shown again."
              }
            >
              <Input
                type="password"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                autoComplete="new-password"
                placeholder={data.tokenSet ? "••••••••" : ""}
                readOnly={locked}
              />
            </Field>
            {locked ? null : <Toggle checked={clearToken} onCheckedChange={setClearToken} label="Remove the stored token" />}
            <Field label="OAuth client id" hint={data.oauthFromEnv ? "Taken from ZENDESK_OAUTH_CLIENT_ID." : "Unique identifier of the mtsportal client."}>
              <Input value={oauthClientId} onChange={(event) => setOauthClientId(event.target.value)} autoComplete="off" readOnly={data.oauthFromEnv} placeholder="mtsportal" />
            </Field>
            <Field label="OAuth client secret" hint={data.oauthSecretSet ? "A secret is stored. Leave this blank to keep it." : "Shown once in Zendesk. It stays on the server."}>
              <Input type="password" value={oauthClientSecret} onChange={(event) => setOauthClientSecret(event.target.value)} autoComplete="new-password" readOnly={data.oauthFromEnv} placeholder={data.oauthSecretSet ? "••••••••" : ""} />
            </Field>
            <Field label="OAuth scopes" hint="Use read write, or the granular scopes set on the client.">
              <Input value={oauthScopes} onChange={(event) => setOauthScopes(event.target.value)} readOnly={data.oauthFromEnv} />
            </Field>
            {data.oauthFromEnv ? null : <Toggle checked={clearOauth} onCheckedChange={setClearOauth} label="Remove the stored OAuth secret" />}
            <Field label="Conversations app id" hint="Sunshine Conversations app id for shop.">
              <Input value={conversationsAppId} onChange={(event) => setConversationsAppId(event.target.value)} autoComplete="off" className="font-mono" />
            </Field>
            <Field label="Conversations key id">
              <Input value={conversationsKeyId} onChange={(event) => setConversationsKeyId(event.target.value)} autoComplete="off" className="font-mono" />
            </Field>
            <Field label="Conversations secret" hint={data.conversationsSecretSet ? "A secret is stored in this portal. Leave this blank to keep it." : "Shown once in Zendesk. It stays on the server."}>
              <Input type="password" value={conversationsSecret} onChange={(event) => setConversationsSecret(event.target.value)} autoComplete="new-password" placeholder={data.conversationsSecretSet ? "••••••••" : ""} />
            </Field>
            <Field label="Webhook id">
              <Input value={webhookId} onChange={(event) => setWebhookId(event.target.value)} autoComplete="off" className="font-mono" />
            </Field>
            <Field label="Webhook shared secret" hint={data.webhookReady ? "A signing secret is stored. Leave this blank to keep it." : "Used to verify POST /api/zendesk/webhook."}>
              <Input type="password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} autoComplete="new-password" placeholder={data.webhookReady ? "••••••••" : ""} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving" : "Save connection"}
              </Button>
              <Button type="button" variant="secondary" disabled={test.isPending} onClick={() => test.mutate()}>
                {test.isPending ? "Checking" : "Test access"}
              </Button>
              <Button type="button" variant="secondary" disabled={sync.isPending} onClick={() => sync.mutate()}>
                {sync.isPending ? "Syncing" : "Sync tickets and users"}
              </Button>
              <Button type="button" variant="secondary" disabled={jobs.isPending} onClick={() => jobs.mutate()}>
                {jobs.isPending ? "Running" : "Run queued jobs"}
              </Button>
            </div>
          </form>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="text-sm font-semibold">mts-auth</h2>
            <p className="mt-1 text-sm text-muted">Authorization code client for the Zendesk connection. Paste these into Zendesk. Do not leave the authorize or token URL on the site root.</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs text-muted">Name</dt><dd className="font-medium">{data.mtsAuth.name}</dd></div>
              <div><dt className="text-xs text-muted">Grant type</dt><dd>Authorization code</dd></div>
              <div><dt className="text-xs text-muted">Client ID</dt><dd className="font-mono">{data.mtsAuth.clientId}</dd></div>
              <div><dt className="text-xs text-muted">Client secret</dt><dd className="break-all font-mono text-xs">{data.mtsAuth.secret}</dd></div>
              <div><dt className="text-xs text-muted">Authorize URL</dt><dd className="break-all font-mono text-xs">{data.mtsAuth.authorizeUrl}</dd></div>
              <div><dt className="text-xs text-muted">Token URL</dt><dd className="break-all font-mono text-xs">{data.mtsAuth.tokenUrl}</dd></div>
              <div><dt className="text-xs text-muted">Scopes</dt><dd>{data.mtsAuth.scopes}</dd></div>
            </dl>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Status</h2>
            <div className="mt-3">
              <Badge tone={tone}>{data.lastStatus || "not connected"}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">
              {data.lastSyncAt ? `Last sync ${ago(data.lastSyncAt)}` : "No ticket sync yet."}
            </p>
            {data.lastError ? <p className="mt-2 text-sm text-bad">{data.lastError}</p> : null}
            <div className="mt-4 border-t border-line pt-3 text-sm">
              <p className="font-medium">OAuth client</p>
              <p className="mt-1 text-muted">
                {data.oauthClientId ? `Authorization code · ${data.oauthClientId} · https://${data.subdomain || "mts-portal"}.zendesk.com/oauth/tokens` : "Not set"}
              </p>
              <p className="mt-3 font-medium">Conversations API</p>
              <p className="mt-1 text-muted">{data.conversationsReady ? `Key ${data.conversationsKeyId} · app ${data.conversationsAppId}` : "Not set"}</p>
              <p className="mt-3 font-medium">Webhook</p>
              <p className="mt-1 text-muted">{data.webhookReady ? `Signing secret set${data.webhookId ? ` · ${data.webhookId}` : ""}` : "Not set"}</p>
              <p className="mt-1 break-all text-xs text-muted">POST /api/zendesk/webhook</p>
            </div>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Company map</h2>
            <ul className="mt-3 divide-y divide-line">
              {data.orgs.map((org) => (
                <li key={org.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to="/organizations/$orgId" params={{ orgId: String(org.id) }} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                  <span className="font-mono text-xs text-muted">{org.zendeskOrgId || "unlinked"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
