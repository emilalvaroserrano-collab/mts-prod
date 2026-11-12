import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboard } from "@/lib/portal/api";
import { ago, money } from "@/lib/portal/format";
import { ticketSearch } from "@/lib/portal/ticket-search";
import { ErrorNote, Loading, PageHeader, Panel, StatusBadge } from "@/components/ui";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNote message={query.error.message} />;
  const data = query.data;
  const openWork = data.tickets.incoming + data.tickets.open;
  const stats = [
    { label: "Companies", value: data.orgCount, to: "/organizations" as const },
    { label: "People", value: data.userCount, to: "/users" as const },
    { label: "Open tickets", value: openWork, hint: `${data.tickets.incoming} new` },
    { label: "Pending", value: data.tickets.pending, hint: `${data.invoiceCount} need invoice` },
  ];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Operations"
        title="Admin"
        description="Live counts for the desk. Tickets, orders, companies, and people stay in sync with the sidebar."
        actions={
          <>
            <Link to="/tickets" search={ticketSearch()} className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[13px] font-semibold text-white">
              Open tickets
            </Link>
            <Link to="/orders" className="inline-flex h-8 items-center rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-semibold">
              Review orders
            </Link>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <>
              <p className="text-xs font-semibold tracking-[0.12em] text-subtle uppercase">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
              {stat.hint ? <p className="mt-1 text-xs text-muted">{stat.hint}</p> : null}
            </>
          );
          return "to" in stat && stat.to ? (
            <Link key={stat.label} to={stat.to} className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:border-line-strong">
              {body}
            </Link>
          ) : (
            <Panel key={stat.label} className="p-4">
              {body}
            </Panel>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {(
          [
            ["New", data.tickets.incoming],
            ["Open", data.tickets.open],
            ["Pending", data.tickets.pending],
            ["Solved", data.tickets.solved],
          ] as const
        ).map(([label, value]) => (
          <Link
            key={label}
            to="/tickets"
            search={ticketSearch({ status: label === "New" ? "new" : label === "Solved" ? "solved" : label.toLowerCase() })}
            className="rounded-xl border border-line bg-surface px-3 py-3 text-[13px] hover:bg-surface-2"
          >
            <span className="text-muted">{label}</span>
            <span className="mt-1 block text-lg font-semibold tabular-nums">{value}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <Panel>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
            <h2 className="text-sm font-semibold">Recent tickets</h2>
            <Link to="/tickets" search={ticketSearch({ status: "all" })} className="text-sm text-accent">
              All tickets
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {data.recentTickets.map((ticket) => (
              <li key={ticket.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link to="/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="font-medium hover:underline">
                    {ticket.subject}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {ticket.zendeskId ? `#${ticket.zendeskId}` : `P-${ticket.id}`} · {ticket.organizationName || "No company"} · {ago(ticket.updatedAt)}
                  </p>
                </div>
                <StatusBadge value={ticket.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
            <h2 className="text-sm font-semibold">Orders in motion</h2>
            <Link to="/orders" className="text-sm text-accent">
              All orders
            </Link>
          </div>
          {data.pendingOrders.length === 0 ? (
            <p className="text-sm text-muted">No orders waiting.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.pendingOrders.map((order) => (
                <li key={order.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/orders/$orderId" params={{ orderId: String(order.id) }} className="font-medium hover:underline">
                      {order.number}
                    </Link>
                    <StatusBadge value={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {order.organizationName} · {money(order.totalCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel>
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <ul className="mt-3 divide-y divide-line">
          {data.activity.length === 0 ? <li className="py-3 text-sm text-muted">No changes yet.</li> : null}
          {data.activity.map((entry) => (
            <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <p className="text-xs text-muted">{ago(entry.createdAt)}</p>
              <p className="text-sm">
                <span className="font-medium">{entry.actorName || "Desk"}</span> {entry.action.toLowerCase()}{" "}
                <span className="font-medium">{entry.target}</span>
                {entry.detail ? <span className="text-muted"> — {entry.detail}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
