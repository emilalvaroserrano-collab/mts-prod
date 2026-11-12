import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ClipboardList, Headphones, House, LayoutDashboard, LogOut, Menu, Receipt, Settings, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getSessionHome, listCustomerNotices } from "@/lib/portal/api";
import { getSarahStatus } from "@/lib/portal/sarah";
import { usePortalSession } from "@/lib/portal/use-portal-session";
import { setShopToken, useShopToken } from "@/lib/portal/shop-session";
import { useCart } from "@/lib/portal/store-cart";
import { usePortalLive } from "@/lib/portal/use-portal-live";
import { PortalAtmosphere } from "@/components/portal-atmosphere";
import { SarahHeaderButton, SarahWidget } from "@/components/sarah-widget";

const NAV = [
  { to: "/portal", label: "Home", icon: House, exact: true, guide: "home" },
  { to: "/portal/tickets", label: "Tickets", icon: Headphones, guide: "tickets" },
  { to: "/portal/shop", label: "Order", icon: ClipboardList, guide: "order" },
  { to: "/portal/orders", label: "Orders", icon: ClipboardList, guide: "orders" },
  { to: "/portal/billing", label: "Billing", icon: Receipt, guide: "billing" },
  { to: "/portal/complaints", label: "Complaints", icon: Headphones, guide: "complaints" },
  { to: "/portal/organization", label: "Organization", icon: House, guide: "organization" },
  { to: "/portal/account", label: "Account", icon: Settings, guide: "account" },
] as const;

const MOBILE_TABS = ["/portal", "/portal/tickets", "/portal/shop", "/portal/billing", "/portal/account"] as const;

function portalHref(path: string, to: string) {
  const base = path.startsWith("/production/user-portal") ? "/production/user-portal" : "/portal";
  if (to === "/portal") return base;
  if (to.startsWith("/portal/")) return `${base}${to.slice("/portal".length)}`;
  return to;
}

export function PortalShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const session = usePortalSession();
  const user = useCurrentUser();
  const home = useQuery({ queryKey: ["session-home"], queryFn: () => getSessionHome() });
  const cart = useCart();
  const token = useShopToken();
  usePortalLive(token);
  const sarah = useQuery({
    queryKey: ["sarah-banner", token],
    queryFn: () => getSarahStatus({ data: { token } }),
    enabled: Boolean(token),
    refetchInterval: 15000,
  });
  const notices = useQuery({
    queryKey: ["customer-notices", token],
    queryFn: () => listCustomerNotices({ data: token }),
    enabled: Boolean(token),
    refetchInterval: 60000,
  });
  const unread = (notices.data ?? []).filter((item) => !item.read).length;
  const [menu, setMenu] = useState(false);
  const current = NAV.find((item) => {
    const href = portalHref(path, item.to);
    return "exact" in item && item.exact ? path === href : path === href || path.startsWith(`${href}/`);
  });
  const name = user?.displayName || session.data?.customer.name || "there";
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="portal-stage grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] text-ink">
      <PortalAtmosphere />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-surface/95 backdrop-blur md:sticky" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 md:h-16 md:gap-3 md:px-8">
          <Link to={portalHref(path, "/portal") as "/portal"} className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-[11px] font-semibold text-white">MT</span>
            <span className="truncate text-sm font-semibold">{current?.label ?? "MTS"}</span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:col-start-1 md:flex" aria-label="Customer">
            {NAV.map((item) => {
              const href = portalHref(path, item.to);
              const active = current?.to === item.to;
              return (
                <Link key={item.to} to={href as "/portal"} data-guide={item.guide} className={active ? "shrink-0 rounded-lg bg-ink px-3 py-2 text-sm text-white" : "shrink-0 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2"}>
                  {item.label}
                </Link>
              );
            })}
            {home.data?.desk ? (
              <a href={path.startsWith("/production") ? "/production/admin-portal" : "/dashboard"} className="hidden shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-accent md:inline">
                Admin
              </a>
            ) : null}
          </nav>
          <div className="col-start-3 flex shrink-0 items-center justify-end">
            <Link to={portalHref(path, "/portal/notifications") as "/portal"} data-guide="notifications" className="relative grid size-10 place-items-center rounded-xl md:size-11" aria-label={unread ? `${unread} unread notifications` : "Notifications"}>
              <Bell className="size-5" />
              {unread > 0 ? <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
            <Link to={portalHref(path, "/portal/shop") as "/portal"} className="relative hidden size-11 place-items-center rounded-xl md:grid" aria-label="Order">
              <ClipboardList className="size-5" />
              {count > 0 ? <span className="absolute top-1 right-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">{count}</span> : null}
            </Link>
            <SarahHeaderButton />
            {home.data?.desk ? (
              <a href={path.startsWith("/production") ? "/production/admin-portal" : "/dashboard"} className="grid size-10 place-items-center rounded-xl text-accent md:hidden" aria-label="Admin">
                <LayoutDashboard className="size-5" />
              </a>
            ) : null}
            <button type="button" className="grid size-10 place-items-center rounded-xl md:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
              <Menu className="size-5" />
            </button>
            <button type="button" className="hidden size-11 place-items-center rounded-xl md:grid" aria-label="Sign out" onClick={() => { setShopToken(""); void signOut("/production/signin"); }}>
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      {sarah.data?.banner ? <p className="border-b border-[#ead7a1] bg-[#fff7e8] px-4 py-2 text-center text-sm text-[#6d5105]">{sarah.data.banner}</p> : null}
      <main className="mx-auto min-w-0 w-full max-w-6xl px-4 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8">{children}</main>
      {menu ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-0 top-0 grid max-h-dvh gap-1 overflow-y-auto bg-surface p-4 shadow-lg" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted">{session.data?.organization || session.data?.business || user?.primaryEmail || ""}</p>
              </div>
              <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="grid size-10 shrink-0 place-items-center"><X className="size-5" /></button>
            </div>
            {NAV.map((item) => (
              <Link key={item.to} to={portalHref(path, item.to) as "/portal"} data-guide={item.guide} onClick={() => setMenu(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface-2">{item.label}</Link>
            ))}
            <Link to={portalHref(path, "/portal/notifications") as "/portal"} onClick={() => setMenu(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface-2">
              <span>Notifications</span>
              {unread > 0 ? <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
            <button type="button" className="rounded-xl px-3 py-3 text-left text-sm font-medium" onClick={() => { setMenu(false); setShopToken(""); void signOut("/production/signin"); }}>Sign out</button>
          </div>
        </div>
      ) : null}
      <SarahWidget />
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface px-1 pt-1 md:hidden" style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }} aria-label="Portal">
        {MOBILE_TABS.map((to) => {
          const item = NAV.find((entry) => entry.to === to);
          if (!item) return null;
          const Icon = item.icon;
          const href = portalHref(path, item.to);
          const active = "exact" in item && item.exact ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <Link key={to} to={href as "/portal"} data-guide={item.guide} aria-current={active ? "page" : undefined} className={active ? "grid min-h-14 place-items-center gap-0.5 text-ink" : "grid min-h-14 place-items-center gap-0.5 text-muted"}>
              <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.to === "/portal/shop" && count > 0 ? <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">{count}</span> : null}
              </span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Locked({ title, body }: { title: string; body: string }) {
  return (
    <section className="grid w-full gap-2 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted">{body}</p>
    </section>
  );
}
