import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPayments, savePayments, testAlternative, testPayments } from "@/lib/portal/api";
import { paymentLabel } from "@/lib/portal/format";
import { Badge, Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Toggle, errorText } from "@/components/ui";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
});

export function PaymentsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["payments"], queryFn: () => getPayments() });
  const [cardEnabled, setCardEnabled] = useState(false);
  const [invoiceEnabled, setInvoiceEnabled] = useState(true);
  const [purchaseOrderEnabled, setPurchaseOrderEnabled] = useState(true);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [invoiceTerms, setInvoiceTerms] = useState("Net 30");
  const [requirePo, setRequirePo] = useState(false);
  const [alternativeEnabled, setAlternativeEnabled] = useState(true);
  const [alternativeClientId, setAlternativeClientId] = useState("");
  const [alternativeClientSecret, setAlternativeClientSecret] = useState("");
  const [clearAlternativeSecret, setClearAlternativeSecret] = useState(false);
  const [alternativeEnvironment, setAlternativeEnvironment] = useState<"sandbox" | "live">("sandbox");

  useEffect(() => {
    if (!query.data) return;
    setCardEnabled(query.data.cardEnabled);
    setInvoiceEnabled(query.data.invoiceEnabled);
    setPurchaseOrderEnabled(query.data.purchaseOrderEnabled);
    setPublishableKey(query.data.publishableKey);
    setSecretKey("");
    setClearSecret(false);
    setInvoiceTerms(query.data.invoiceTerms);
    setRequirePo(query.data.requirePo);
    setAlternativeEnabled(query.data.alternativeEnabled);
    setAlternativeClientId(query.data.alternativeClientId);
    setAlternativeClientSecret("");
    setClearAlternativeSecret(false);
    setAlternativeEnvironment(query.data.alternativeEnvironment);
  }, [query.data]);

  function refresh() {
    client.invalidateQueries({ queryKey: ["payments"] });
  }

  const save = useMutation({
    mutationFn: () =>
      savePayments({
        data: {
          cardEnabled,
          invoiceEnabled,
          purchaseOrderEnabled,
          publishableKey,
          secretKey,
          clearSecret,
          invoiceTerms,
          requirePo,
          alternativeEnabled,
          alternativeClientId,
          alternativeClientSecret,
          clearAlternativeSecret,
          alternativeEnvironment,
        },
      }),
    onSuccess: () => {
      toast.success("Payment methods saved");
      setSecretKey("");
      refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const test = useMutation({
    mutationFn: () => testPayments(),
    onSuccess: (result) => {
      toast.success(`Stripe connected · ${result.name}`);
      refresh();
    },
    onError: (error) => {
      toast.error(errorText(error));
      refresh();
    },
  });
  const testAlternativeConnection = useMutation({
    mutationFn: () => testAlternative(),
    onSuccess: (result) => {
      toast.success(result.mode === "sandbox" ? "Sandbox connected" : "Live account connected");
      refresh();
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

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Checkout"
        title="Payments"
        description="Turn on Alternative Payments, card, invoice, or purchase order."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Panel>
            <h2 className="text-sm font-semibold">Card</h2>
            <p className="mt-1 text-[13px] text-muted">Stripe. Set STRIPE_SECRET_KEY on the server, or paste a secret key here.</p>
            <div className="mt-4">
              <Toggle checked={cardEnabled} onCheckedChange={setCardEnabled} label="Accept card payments" />
            </div>
            <div className="mt-4 grid gap-3">
              <Field label="Publishable key" hint={data.fromEnv && data.publishableKey ? "Taken from STRIPE_PUBLISHABLE_KEY when that variable is set." : "Starts with pk_. Safe to store."}>
                <Input value={publishableKey} onChange={(event) => setPublishableKey(event.target.value)} autoComplete="off" placeholder="pk_live_…" />
              </Field>
              <Field
                label="Secret key"
                hint={
                  data.fromEnv
                    ? "Taken from STRIPE_SECRET_KEY. It stays on the server."
                    : data.secretSet && !clearSecret
                      ? "A secret is already stored. Leave this blank to keep it."
                      : "Starts with sk_. It is not shown again."
                }
              >
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  autoComplete="new-password"
                  placeholder={data.secretSet ? "••••••••" : "sk_live_…"}
                  readOnly={data.fromEnv}
                />
              </Field>
              {data.fromEnv ? null : <Toggle checked={clearSecret} onCheckedChange={setClearSecret} label="Remove the stored secret" />}
            </div>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Alternative Payments</h2>
            <p className="mt-1 text-[13px] text-muted">
              Checkout opens at{" "}
              <a href="https://go.alternativepayments.io" className="text-info underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                go.alternativepayments.io
              </a>
              . Add API keys to create a customer, an invoice, and a payment link for each order.
            </p>
            <div className="mt-4 grid gap-3">
              <Toggle checked={alternativeEnabled} onCheckedChange={setAlternativeEnabled} label="Accept Alternative Payments" />
              <Field
                label="Environment"
                hint={
                  data.alternativeEnvironmentLocked
                    ? "Set with ALTERNATIVE_ENV. sandbox is the demo host. Use live for production."
                    : "Sandbox uses the demo API. Switch to live only with production keys."
                }
              >
                <Select
                  value={alternativeEnvironment}
                  disabled={data.alternativeEnvironmentLocked}
                  onChange={(event) => setAlternativeEnvironment(event.target.value === "live" ? "live" : "sandbox")}
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="live">Live</option>
                </Select>
              </Field>
              <Field label="Client id" hint={data.alternativeFromEnv ? "Taken from ALTERNATIVE_CLIENT_ID." : "From the Alternative Payments partner dashboard."}>
                <Input
                  value={alternativeClientId}
                  onChange={(event) => setAlternativeClientId(event.target.value)}
                  autoComplete="off"
                  readOnly={data.alternativeFromEnv}
                />
              </Field>
              <Field
                label="Client secret"
                hint={
                  data.alternativeFromEnv
                    ? "Taken from ALTERNATIVE_CLIENT_SECRET."
                    : data.alternativeSecretSet && !clearAlternativeSecret
                      ? "A secret is already stored. Leave this blank to keep it."
                      : "Stored on the server. It is not shown again."
                }
              >
                <Input
                  type="password"
                  value={alternativeClientSecret}
                  onChange={(event) => setAlternativeClientSecret(event.target.value)}
                  autoComplete="new-password"
                  placeholder={data.alternativeSecretSet ? "••••••••" : ""}
                  readOnly={data.alternativeFromEnv}
                />
              </Field>
              {data.alternativeFromEnv ? null : (
                <Toggle checked={clearAlternativeSecret} onCheckedChange={setClearAlternativeSecret} label="Remove the stored secret" />
              )}
              <div>
                <Button type="button" variant="secondary" disabled={testAlternativeConnection.isPending} onClick={() => testAlternativeConnection.mutate()}>
                  {testAlternativeConnection.isPending ? "Checking" : "Test Alternative Payments"}
                </Button>
              </div>
              {data.alternativeError ? <p className="text-[13px] text-bad">{data.alternativeError}</p> : null}
              {data.alternativeStatus === "connected" ? <p className="text-[13px] text-good">Connected</p> : null}
            </div>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Invoice</h2>
            <p className="mt-1 text-[13px] text-muted">Bill the company on terms. No card is charged.</p>
            <div className="mt-4 grid gap-3">
              <Toggle checked={invoiceEnabled} onCheckedChange={setInvoiceEnabled} label="Accept invoices" />
              <Field label="Terms">
                <Select value={invoiceTerms} onChange={(event) => setInvoiceTerms(event.target.value)}>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                </Select>
              </Field>
            </div>
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Purchase order</h2>
            <p className="mt-1 text-[13px] text-muted">Accept a PO number in the order notes.</p>
            <div className="mt-4 grid gap-3">
              <Toggle checked={purchaseOrderEnabled} onCheckedChange={setPurchaseOrderEnabled} label="Accept purchase orders" />
              <Toggle checked={requirePo} onCheckedChange={setRequirePo} label="Require a PO number in the notes" />
            </div>
          </Panel>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving" : "Save methods"}
            </Button>
            <Button type="button" variant="secondary" disabled={test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? "Checking" : "Test Stripe"}
            </Button>
          </div>
        </form>
        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="text-sm font-semibold">Stripe</h2>
            <div className="mt-3">
              <Badge tone={tone}>{data.lastStatus || "not connected"}</Badge>
            </div>
            <p className="mt-3 text-[13px] text-muted">{data.accountName || "No Stripe account confirmed yet."}</p>
            {data.lastError ? <p className="mt-2 text-[13px] text-bad">{data.lastError}</p> : null}
          </Panel>
          <Panel>
            <h2 className="text-sm font-semibold">Available on orders</h2>
            <ul className="mt-3 divide-y divide-line text-[13px]">
              {data.methods.length ? (
                data.methods.map((method) => (
                  <li key={method} className="flex items-center justify-between py-2">
                    <span className="font-medium">{paymentLabel(method)}</span>
                    <span className="text-muted">
                      {method === "invoice"
                        ? data.invoiceTerms
                        : method === "card"
                          ? "Stripe"
                          : method === "alternative"
                            ? data.alternativeEnvironment === "sandbox"
                              ? "Sandbox"
                              : "Live"
                            : data.requirePo
                              ? "PO required"
                              : "Optional"}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-muted">Turn on at least one method.</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
