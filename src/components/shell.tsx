import { useQuery } from "@tanstack/react-query";
import { PortalAtmosphere } from "@/components/portal-atmosphere";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  Bell,
  BookOpen,
  Cable,
  ClipboardList,
  CreditCard,
  Eye,
  LayoutDashboard,
  ListTree,
  Megaphone,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  Ticket,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getShell } from "@/lib/portal/api";
import { storeSlug } from "@/lib/portal/format";
import type { Role, ShellInfo } from "@/lib/portal/types";
import { ticketSearch } from "@/lib/portal/ticket-search";
import { Boot, Input } from "./ui";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, group: "Work" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Work" },
  { to: "/tickets", label: "Tickets", icon: Ticket, group: "Work" },
  { to: "/orders", label: "Orders", icon: ClipboardList, group: "Work" },
  { to: "/organizations", label: "Companies", icon: Building2, group: "Directory" },
  { to: "/users", label: "People", icon: Users, group: "Directory" },
  { to: "/access", label: "Customer access", icon: UserRound, group: "Directory" },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, group: "Directory" },
  { to: "/services", label: "Services", icon: Wrench, group: "Directory" },
  { to: "/products", label: "Catalog", icon: Monitor, group: "Commerce" },
  { to: "/payments", label: "Payments", icon: CreditCard, group: "Commerce" },
  { to: "/forms", label: "Ticket forms", icon: ListTree, group: "Setup" },
  { to: "/roles", label: "Roles", icon: Shield, group: "Setup" },
  { to: "/integrations", label: "Zendesk", icon: Cable, group: "Setup" },
  { to: "/settings", label: "Settings", icon: Settings, group: "Setup" },
  { to: "/docs", label: "Docs", icon: BookOpen, group: "Setup" },
] as const;

const GROUPS = ["Work", "Directory", "Commerce", "Setup"] as const;
const MOBILE_TABS = ["/dashboard", "/tickets", "/orders", "/products"] as const;

const NAV_COUNTS: Partial<Record<(typeof NAV)[number]["to"], (info: ShellInfo) => number>> = {
  "/tickets": (info) => info.ticketCount,
  "/organizations": (info) => info.companyCount,
  "/users": (info) => info.peopleCount,
  "/products": (info) => info.catalogCount,
  "/orders": (info) => info.orderCount,
  "/notifications": (info) => info.noticeCount,
};

function adminHref(path: string, to: string) {
  if (!path.startsWith("/production/admin-portal")) return to;
  if (to === "/dashboard") return "/production/admin-portal";
  return `/production/admin-portal${to}`;
}

function adminActive(path: string, to: string, exact = false) {
  const href = adminHref(path, to);
  return exact ? path === href || path === `${href}/` : path === href || path.startsWith(`${href}/`);
}

function roleLabel(role: Role | undefined) {
  if (role === "owner") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "agent") return "Agent";
  if (role === "viewer") return "View only";
  return "Staff";
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const [find, setFind] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const shell = useQuery({
    queryKey: ["shell"],
    queryFn: () => getShell(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    setMore(false);
    setFind(false);
  }, [path]);

  useEffect(() => {
    const item = NAV.find((entry) => adminActive(path, entry.to, "exact" in entry && entry.exact));
    document.title = item ? `${item.label} · Manage Tech Service` : "Manage Tech Service";
  }, [path]);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("mts-sidebar") === "collapsed");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("mts-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  const productionAdmin = path.startsWith("/production/admin-portal");
  if (!productionAdmin && (isPending || (user && shell.isPending))) return <Boot />;
  if (!user && !productionAdmin) return null;
  if (productionAdmin && !isPending && !user) return null;
  const info = shell.data;
  const current = NAV.find((entry) => adminActive(path, entry.to, "exact" in entry && entry.exact));

  function Nav({ compact }: { compact: boolean }) {
    return (
      <div className="flex h-full flex-col bg-surface/80 backdrop-blur">
        <div className={compact ? "flex h-16 shrink-0 items-center justify-center border-b border-line px-2" : "flex h-16 shrink-0 items-center gap-3 border-b border-line px-4"}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold tracking-wide text-white">MT</span>
          {compact ? null : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-ink">{info?.brandName ?? "Manage Tech Service"}</p>
                <p className="text-xs text-muted">Admin desk</p>
              </div>
              <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Collapse sidebar"
                onClick={toggleCollapsed}
              >
                <PanelLeftClose className="size-4" />
              </button>
            </>
          )}
        </div>
        <nav className={compact ? "flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-3" : "flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4"} aria-label="Admin">
          {compact ? (
            <button
              type="button"
              className="grid h-11 w-full place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={toggleCollapsed}
            >
              <PanelLeftOpen className="size-4" />
            </button>
          ) : null}
          {GROUPS.map((group) => (
            <div key={group}>
              {compact ? <div className="mx-2 mb-1 h-px bg-line" /> : <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{group}</p>}
              <div className="flex flex-col gap-0.5">
                {NAV.filter((item) => item.group === group).map((item) => {
                  const href = adminHref(path, item.to);
                  const active = adminActive(path, item.to, "exact" in item && item.exact);
                  const Icon = item.icon;
                  const count = info ? NAV_COUNTS[item.to]?.(info) : undefined;
                  return (
                    <Link
                      key={item.to}
                      to={href as "/dashboard"}
                      search={item.to === "/tickets" ? ticketSearch() : undefined}
                      aria-current={active ? "page" : undefined}
                      title={compact ? `${item.label}${count != null ? ` (${count})` : ""}` : undefined}
                      className={
                        compact
                          ? active
                            ? "flex h-11 items-center justify-center rounded-xl bg-ink text-white"
                            : "flex h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
                          : active
                            ? "flex h-11 items-center gap-2.5 rounded-xl bg-ink px-3 text-sm font-semibold text-white"
                            : "flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                      }
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      {compact ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!compact && count != null && (item.to !== "/notifications" || count > 0) ? (
                        <span className={active ? "rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums" : "rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink"}>
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
                {group === "Commerce" ? (
                  <>
                  <a
                    href={path.startsWith("/production/admin-portal") ? "/production/user-portal/shop" : `/store/${storeSlug(info?.brandName ?? "Manage Tech Service")}`}
                    target="_blank"
                    rel="noreferrer"
                    title={compact ? "Online Shop" : undefined}
                    className={compact ? "flex h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" : "flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"}
                  >
                    <Eye className="size-4 shrink-0" strokeWidth={1.75} />
                    {compact ? null : "Online Shop"}
                  </a>
                  <a
                    href={path.startsWith("/production/admin-portal") ? "/production/user-portal" : "/portal"}
                    title={compact ? "Customer portal" : undefined}
                    className={compact ? "flex h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" : "flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"}
                  >
                    <UserRound className="size-4 shrink-0" strokeWidth={1.75} />
                    {compact ? null : "Customer portal"}
                  </a>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </nav>
        <div className={compact ? "flex justify-center border-t border-line px-2 py-3" : "border-t border-line px-4 py-3"}>
          <p className={compact ? "flex items-center" : "flex items-center gap-2 text-xs font-medium text-ink"} title={info?.zendeskConnected ? "Zendesk connected" : "Zendesk needs a client"}>
            <span className={info?.zendeskConnected ? "size-2 rounded-full bg-good" : "size-2 rounded-full bg-warn"} />
            {compact ? null : info?.zendeskConnected ? "Zendesk connected" : "Zendesk needs a client"}
          </p>
          {compact ? null : <p className="mt-1 truncate text-xs text-muted">{roleLabel(info?.actor.role)} · {info?.actor.email || info?.actor.name}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="portal-stage min-h-screen text-ink">
      <PortalAtmosphere />
      <div className={collapsed ? "min-h-screen md:grid md:grid-cols-[4.5rem_minmax(0,1fr)]" : "min-h-screen md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]"}>
      <aside className="hidden border-r border-line md:sticky md:top-0 md:block md:h-screen"><Nav compact={collapsed} /></aside>
      {more ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-[4.25rem] grid max-h-[70vh] content-start gap-3 overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 shadow-[0_-12px_40px_rgba(0,57,112,0.12)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
              <p className="text-sm font-semibold">More</p>
              <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label="Close" onClick={() => setMore(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.filter((item) => !MOBILE_TABS.includes(item.to as (typeof MOBILE_TABS)[number])).map((item) => {
                const Icon = item.icon;
                const active = adminActive(path, item.to);
                const count = info ? NAV_COUNTS[item.to]?.(info) : undefined;
                return (
                  <Link
                    key={item.to}
                    to={adminHref(path, item.to) as "/dashboard"}
                    className={active ? "grid min-h-20 content-center justify-items-center gap-1 rounded-2xl bg-ink px-2 py-3 text-center text-white" : "grid min-h-20 content-center justify-items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-center text-ink"}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    <span className="text-[12px] font-medium leading-tight">{item.label}</span>
                    {count != null ? <span className="text-[11px] tabular-nums opacity-70">{count}</span> : null}
                  </Link>
                );
              })}
              <a
                href={path.startsWith("/production/admin-portal") ? "/production/user-portal/shop" : `/store/${storeSlug(info?.brandName ?? "Manage Tech Service")}`}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-20 content-center justify-items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-center text-ink"
              >
                <Eye className="size-5" strokeWidth={1.75} />
                <span className="text-[12px] font-medium leading-tight">Online Shop</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid min-h-screen min-w-0 grid-rows-[auto_minmax(0,1fr)]">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
          <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-3 md:px-5">
            <div className="min-w-0 md:hidden">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{current?.group ?? "Desk"}</p>
              <p className="truncate text-sm font-semibold text-ink">{current?.label ?? "Admin"}</p>
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{current?.group ?? "Desk"}</p>
              <p className="truncate text-sm font-semibold text-ink">{current?.label ?? "Admin"}</p>
            </div>
            <form
              className="relative hidden min-w-0 md:block"
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ to: adminHref(path, "/tickets") as "/tickets", search: ticketSearch({ q: query.trim(), status: "all" }) });
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets"
                aria-label="Search tickets"
                className="h-10 border-transparent bg-surface-2 pl-9"
              />
            </form>
            <div className="grid grid-flow-col items-center gap-1">
              <Link
                to={adminHref(path, "/notifications") as "/notifications"}
                className="relative grid size-11 place-items-center rounded-xl text-ink"
                aria-label={info?.noticeCount ? `${info.noticeCount} unread notifications` : "Notifications"}
              >
                <Bell className="size-5" />
                {info?.noticeCount ? (
                  <span className="absolute top-1 right-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">
                    {info.noticeCount > 99 ? "99+" : info.noticeCount}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-xl text-ink md:hidden"
                aria-label="Search tickets"
                aria-expanded={find}
                onClick={() => setFind((value) => !value)}
              >
                <Search className="size-5" />
              </button>
              <UserButton />
            </div>
          </div>
          {find ? (
            <form
              className="grid px-3 pb-3 md:hidden"
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ to: adminHref(path, "/tickets") as "/tickets", search: ticketSearch({ q: query.trim(), status: "all" }) });
              }}
            >
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets"
                aria-label="Search tickets"
                autoFocus
                className="h-12 bg-surface-2 text-base"
              />
            </form>
          ) : null}
          {info?.actor.role === "viewer" ? (
            <p className="border-t border-[#e3c98a] bg-warn-soft px-4 py-2 text-sm text-warn">
              View-only access. Changes are turned off for this account.
            </p>
          ) : null}
        </header>
        <div className="admin-main grid w-full min-w-0 max-w-full content-start py-5 pb-[max(6.5rem,env(safe-area-inset-bottom))] md:pb-6">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/80 px-1 pt-1 backdrop-blur md:hidden" style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }} aria-label="Admin">
          {MOBILE_TABS.map((to) => {
            const item = NAV.find((entry) => entry.to === to);
            if (!item) return null;
            const Icon = item.icon;
            const active = adminActive(path, item.to, "exact" in item && item.exact);
            const count = info ? NAV_COUNTS[item.to]?.(info) : undefined;
            return (
              <Link
                key={to}
                to={adminHref(path, item.to) as "/dashboard"}
                search={item.to === "/tickets" ? ticketSearch() : undefined}
                aria-current={active ? "page" : undefined}
                className={active ? "grid min-h-14 place-items-center gap-0.5 text-ink" : "grid min-h-14 place-items-center gap-0.5 text-muted"}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                  {count ? <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">{count > 99 ? "99+" : count}</span> : null}
                </span>
                <span className="text-[11px] font-medium">{item.label === "Dashboard" ? "Home" : item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={more || (current && !MOBILE_TABS.includes(current.to as (typeof MOBILE_TABS)[number])) ? "grid min-h-14 place-items-center gap-0.5 text-ink" : "grid min-h-14 place-items-center gap-0.5 text-muted"}
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          >
            <ListTree className="size-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">More</span>
          </button>
        </nav>
      </div>
      </div>
    </div>
  );
}
