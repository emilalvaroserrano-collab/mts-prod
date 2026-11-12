import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Bell, Building2, ChevronLeft, ClipboardList, CreditCard, Monitor, Shield, Ticket, Users } from "lucide-react";
import { useEffect } from "react";
import { getNotification } from "@/lib/portal/api";
import { ago } from "@/lib/portal/format";
import { ErrorNote, Loading } from "@/components/ui";

export const Route = createFileRoute("/_app/notifications/$notificationId")({
  component: NotificationPage,
});

const AUDIENCE: Record<string, string> = {
  staff: "Everyone on the desk, including view-only",
  agent: "Agents, admins, and Super Admins",
  admin: "Admins and Super Admins",
  owner: "Super Admin only",
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

export function NotificationPage() {
  const { notificationId = "" } = useParams({ strict: false });
  const id = Number(notificationId);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["notification", id], queryFn: () => getNotification({ data: id }) });

  useEffect(() => {
    if (!query.isSuccess) return;
    client.invalidateQueries({ queryKey: ["notifications"] });
    client.invalidateQueries({ queryKey: ["shell"] });
  }, [query.isSuccess, id, client]);

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const notice = query.data;
  const kind = KINDS[notice.kind] ?? { label: notice.kind || "Desk", icon: Bell, tone: "bg-surface-2 text-ink" };
  const Icon = kind.icon;

  return (
    <div className="grid w-full min-w-0 gap-4 pb-24 md:pb-0">
      <Link to="/notifications" className="inline-flex h-11 w-fit items-center gap-1 text-sm font-semibold text-ink">
        <ChevronLeft className="size-4" />
        Notifications
      </Link>
      <article className="grid w-full min-w-0 gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${kind.tone}`}>
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{kind.label}</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">{notice.title}</h1>
            <p className="mt-1 text-sm text-muted">{ago(notice.createdAt)}</p>
          </div>
        </div>
        <p className="break-words text-[15px] leading-7 text-ink">{notice.body || "No extra detail was recorded."}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-bg px-4 py-3">
            <dt className="text-[11px] font-semibold tracking-wide text-subtle uppercase">From</dt>
            <dd className="mt-1 text-sm font-medium">{notice.actorName || "The desk"}</dd>
          </div>
          <div className="rounded-2xl bg-bg px-4 py-3">
            <dt className="text-[11px] font-semibold tracking-wide text-subtle uppercase">Who can see this</dt>
            <dd className="mt-1 text-sm font-medium">{AUDIENCE[notice.audience] || notice.audience}</dd>
          </div>
        </dl>
      </article>
      {notice.href ? (
        <div className="fixed inset-x-0 z-20 px-4 md:static md:px-0" style={{ bottom: "max(5.25rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}>
          <a href={notice.href} className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-ink text-sm font-semibold text-white shadow-lg lg:w-fit lg:px-6 lg:shadow-none">
            Open the record
          </a>
        </div>
      ) : null}
    </div>
  );
}
