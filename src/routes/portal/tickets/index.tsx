import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortalSession } from "@/lib/portal/use-portal-session";

export const Route = createFileRoute("/portal/tickets/")({
  component: TicketList,
});

export function TicketList() {
  const session = usePortalSession();
  const tickets = session.data?.tickets ?? [];
  return (
    <div className="grid w-full gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Support tickets</h1>
        <Link to="/portal/tickets/new" className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white">New ticket</Link>
      </div>
      <ul className="grid gap-2">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link to="/portal/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="grid gap-1 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold">{ticket.subject}</span>
                <span className="text-xs font-semibold uppercase text-accent">{ticket.status}</span>
              </span>
              <span className="text-xs text-muted">{ticket.category || "Support"}{ticket.zendeskId ? ` · Zendesk #${ticket.zendeskId}` : " · Waiting on Zendesk"}</span>
            </Link>
          </li>
        ))}
        {session.data && tickets.length === 0 ? <li className="text-sm text-muted">No tickets on this account yet.</li> : null}
      </ul>
    </div>
  );
}
