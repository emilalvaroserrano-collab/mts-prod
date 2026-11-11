import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreFrame, useStore } from "@/components/storefront";
import { OrderBarcode } from "@/components/order-barcode";
import { getShopAccount, saveShopProfile, shopLogin, shopLogout, shopRegister } from "@/lib/portal/api";
import { day, money, paymentLabel } from "@/lib/portal/format";
import { setShopToken, useShopToken } from "@/lib/portal/shop-session";
import { Button, Field, Input } from "@/components/ui";
import type { ShopOrder } from "@/lib/portal/types";

export const Route = createFileRoute("/store/$slug/account")({
  component: AccountPage,
});

const SHIPMENT = ["unfulfilled", "shipped", "out_for_delivery", "delivered"] as const;

function shipmentLabel(value: string) {
  if (value === "out_for_delivery") return "Out for delivery";
  if (value === "unfulfilled") return "Not shipped";
  if (value === "shipped") return "Shipped";
  if (value === "delivered") return "Delivered";
  return value || "Not shipped";
}

function AccountPage() {
  return (
    <StoreFrame>
      <Account />
    </StoreFrame>
  );
}

function Account() {
  const { slug } = useStore();
  const token = useShopToken();
  const client = useQueryClient();
  const account = useQuery({
    queryKey: ["shop-account", token],
    queryFn: () => getShopAccount({ data: token }),
    enabled: Boolean(token),
  });
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const auth = useMutation({
    mutationFn: () => (mode === "up" ? shopRegister({ data: { name, email, password } }) : shopLogin({ data: { email, password } })),
    onSuccess: (result) => {
      setShopToken(result.token);
      setPassword("");
      setError("");
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not sign in."),
  });
  const signOut = useMutation({
    mutationFn: () => shopLogout({ data: { token } }),
    onSuccess: () => {
      setShopToken("");
      client.removeQueries({ queryKey: ["shop-account"] });
    },
  });

  if (!token || account.data === null) {
    return (
      <main className="mx-auto grid max-w-md gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted">This portal is invite only. MTS adds your email in Zendesk, then you sign in with that same email.</p>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            auth.mutate();
          }}
        >
          {mode === "up" ? (
            <Field label="Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
            </Field>
          ) : null}
          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "up" ? "new-password" : "current-password"} />
          </Field>
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <Button type="submit" disabled={auth.isPending}>{auth.isPending ? "Working" : mode === "up" ? "Create account" : "Sign in"}</Button>
        </form>
        <button type="button" className="text-left text-sm text-muted">
          New accounts are created in Zendesk, then they can sign in here.
        </button>
      </main>
    );
  }

  if (account.isPending || !account.data) {
    return <main className="grid min-h-48 place-items-center px-4 py-16 text-center text-sm text-muted">Loading your account…</main>;
  }

  const customer = account.data.customer;
  const selected = account.data.orders.find((order) => order.id === openId) ?? account.data.orders[0];

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="grid content-start gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight">{customer.name || "Your profile"}</h1>
        <p className="text-sm text-muted">{customer.email}</p>
        <p className="text-sm">{customer.payLater ? "Order now, pay later is on for this account." : "Payment is required before checkout."}</p>
        <button type="button" className="w-fit text-sm text-muted underline-offset-2 hover:underline" onClick={() => signOut.mutate()}>
          Sign out
        </button>
      </aside>
      <div className="grid gap-8">
        <ProfileForm token={token} customer={customer} />
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Orders</h2>
          {account.data.orders.length === 0 ? <p className="mt-3 text-sm text-muted">No orders yet.</p> : null}
          <ul className="grid divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {account.data.orders.map((order) => (
              <li key={order.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm" onClick={() => setOpenId(order.id)}>
                  <span>
                    <span className="font-medium">{order.number}</span>
                    <span className="mt-0.5 block text-xs text-muted">{day(order.createdAt)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block tabular-nums">{money(order.totalCents)}</span>
                    <span className="text-xs text-muted">{shipmentLabel(order.shipmentStatus)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? <OrderDetail order={selected} slug={slug} /> : null}
        </section>
      </div>
    </main>
  );
}

function ProfileForm({
  token,
  customer,
}: {
  token: string;
  customer: { name: string; phone: string; address: string; city: string; region: string; postal: string; country: string };
}) {
  const client = useQueryClient();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [city, setCity] = useState(customer.city);
  const [region, setRegion] = useState(customer.region);
  const [postal, setPostal] = useState(customer.postal);
  const [country, setCountry] = useState(customer.country);
  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setCity(customer.city);
    setRegion(customer.region);
    setPostal(customer.postal);
    setCountry(customer.country);
  }, [customer]);
  const save = useMutation({
    mutationFn: () => saveShopProfile({ data: { token, name, phone, address, city, region, postal, country } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["shop-account", token] }),
  });
  return (
    <form
      className="grid gap-3 rounded-2xl border border-line p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="text-lg font-semibold">Profile</h2>
      <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
      <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
      <Field label="Address"><Input value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
        <Field label="State"><Input value={region} onChange={(event) => setRegion(event.target.value)} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Postal code"><Input value={postal} onChange={(event) => setPostal(event.target.value)} /></Field>
        <Field label="Country"><Input value={country} onChange={(event) => setCountry(event.target.value)} /></Field>
      </div>
      <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving" : save.isSuccess ? "Saved" : "Save profile"}</Button>
    </form>
  );
}

function OrderDetail({ order, slug }: { order: ShopOrder; slug: string }) {
  const reached = Math.max(0, SHIPMENT.indexOf(order.shipmentStatus as (typeof SHIPMENT)[number]));
  return (
    <article className="grid gap-4 rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{order.number}</h3>
          <div className="mt-3 max-w-sm rounded-lg bg-white px-2 py-3">
            <OrderBarcode value={order.number} height={64} />
            <p className="mt-1 text-center font-mono text-xs tracking-[0.16em]">{order.number}</p>
          </div>
          <p className="text-xs text-muted">{paymentLabel(order.paymentMethod)} · {order.shippingMethod === "express" ? "Express" : "Standard"}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums">{money(order.totalCents)}</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-4">
        {SHIPMENT.map((step, index) => (
          <li key={step} className={index <= reached ? "rounded-lg bg-ink px-2 py-2 text-xs text-white" : "rounded-lg bg-[#f6f6f6] px-2 py-2 text-xs text-muted"}>
            {shipmentLabel(step)}
          </li>
        ))}
      </ol>
      {order.trackingNumber ? (
        <p className="mt-3 text-sm">
          {order.trackingCarrier || "Tracking"} · <span className="font-mono">{order.trackingNumber}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">No tracking number yet.</p>
      )}
      <p className="mt-2 text-sm text-muted">
        {[order.shipAddress, order.shipCity, order.shipRegion, order.shipPostal, order.shipCountry].filter(Boolean).join(", ")}
      </p>
      <ul className="grid text-sm">
        {order.items.map((item) => (
          <li key={item.sku} className="flex justify-between gap-3 border-t border-line py-2 first:border-t-0">
            <span>{item.quantity} × {item.name}</span>
            <span className="tabular-nums">{money(item.quantity * item.unitPriceCents)}</span>
          </li>
        ))}
      </ul>
      {order.paymentUrl ? (
        <a href={order.paymentUrl} className="inline-flex text-sm underline" target="_blank" rel="noreferrer">
          Payment link
        </a>
      ) : null}
      <Link to="/store/$slug" params={{ slug }} className="text-sm text-muted">
        Back to the shop
      </Link>
    </article>
  );
}
