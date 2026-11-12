import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Building2, ClipboardList, CreditCard, Monitor, Shield, Ticket, Users } from "lucide-react";
import { useState } from "react";
import { listNotifications } from "@/lib/portal/api";
import { ago } from "@/lib/portal/format";
import type { Notice } from "@/lib/portal/types";
import { ErrorNote, Loading, PageHeader } from "@/components/ui";

export const Route = createFileRoute("/_app/notifications/")({
  component: NotificationsPage,
});

const AUDIENCE: Record<string, string> = {
  staff: "Everyone",
  agent: "Agents",
  admin: "Admins",
  owner: "Super Admin",
};

const KINDS: Record<string, { label: string; icon: typeof Bell; tone: string }> = {
  ticket: { label: "Ticket", icon: Ticket, tone: "bg-info-soft text-info" },
  order: { label: "Order", icon: ClipboardList, tone: "bg-accent-soft text-accent" },
  person: { label: "Person", icon: Users, tone: "bg-[#e7eef8] text-ink" },
  company: { label: "Company", icon: Building2, tone: "bg-[#e7eef8] text-ink" },
  catalog: { label: "Catalog", icon: Monitor, tone: "bg-surface-2 text-ink" },
  payment: { label: "Payment", icon: CreditCard, tone: "bg-warn-soft text-warn" },
  desk: { label: "Desk", icon: Shield, tone: "bg-surface-2 text-ink" },
};

function kindOf(notice: Notice) {
  return KINDS[notice.kind] ?? { label: notice.kind || "Desk", icon: Bell, tone: "bg-surface-2 text-ink" };
}

export function NotificationsPage() {
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = query.data?.filter((notice) => !notice.read).length ?? 0;
  const shown = (query.data ?? []).filter((notice) => filter === "all" || !notice.read);

  return (
    <div className="grid w-full min-w-0 gap-4">
      <PageHeader
        eyebrow="Desk"
        title="Notifications"
        description={unread ? `${unread} unread for your role.` : "You are caught up. New desk activity will land here."}
      />
      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        <button type="button" onClick={() => setFilter("all")} className={filter === "all" ? "h-11 rounded-full bg-ink text-sm font-semibold text-white" : "h-11 rounded-full border border-line bg-surface text-sm text-muted"}>
          All
        </button>
        <button type="button" onClick={() => setFilter("unread")} className={filter === "unread" ? "h-11 rounded-full bg-ink text-sm font-semibold text-white" : "h-11 rounded-full border border-line bg-surface text-sm text-muted"}>
          Unread{unread ? ` ${unread}` : ""}
        </button>
      </div>
      {query.isPending ? <Loading /> : null}
      {query.isError ? <ErrorNote message={query.error.message} /> : null}
      {query.data && shown.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Bell className="size-5" /></span>
          <p className="font-semibold">{filter === "unread" ? "No unread alerts" : "Nothing for your role yet"}</p>
          <p className="max-w-sm text-sm text-muted">Tickets, orders, and people changes show up here when your role is allowed to see them.</p>
        </div>
      ) : null}
      <ul className="grid gap-2">
        {shown.map((notice) => {
          const kind = kindOf(notice);
          const Icon = kind.icon;
          return (
            <li key={notice.id}>
              <Link
                to="/notifications/$notificationId"
                params={{ notificationId: String(notice.id) }}
                className={notice.read
                  ? "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
                  : "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-accent/30 bg-white p-3 shadow-[0_1px_0_rgba(18,126,134,0.15)] sm:p-4"}
              >
                <span className={`grid size-11 place-items-center rounded-2xl ${kind.tone}`}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{kind.label}</span>
                        {!notice.read ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-white">New</span> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[15px] font-semibold">{notice.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{ago(notice.createdAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-sm leading-5 text-muted">{notice.body}</span>
                  <span className="text-xs text-muted">
                    {AUDIENCE[notice.audience] || notice.audience}
                    {notice.actorName ? ` · ${notice.actorName}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
