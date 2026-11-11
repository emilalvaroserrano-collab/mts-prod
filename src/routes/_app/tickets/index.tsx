import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listTickets } from "@/lib/portal/api";
import { ago, day } from "@/lib/portal/format";
import { ticketSearch } from "@/lib/portal/ticket-search";
import { ErrorNote, Loading, PageHeader, Select, StatusBadge, ViewSwitch, useViewMode } from "@/components/ui";

const VIEWS = ["", "Pending Projects", "Pending Orders", "Need Invoice"];

export const Route = createFileRoute("/_app/tickets/")({
  validateSearch: (search: Record<string, unknown>) => ticketSearch({
    q: typeof search.q === "string" ? search.q : "",
    status: typeof search.status === "string" ? search.status : "unresolved",
    org: typeof search.org === "string" ? search.org : "",
    category: typeof search.category === "string" ? search.category : "",
    assignee: typeof search.assignee === "string" ? search.assignee : "",
    view: typeof search.view === "string" ? search.view : "",
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useQuery({
    queryKey: ["tickets", search],
    queryFn: () =>
      listTickets({
        data: {
          q: search.q,
          status: search.status,
          orgId: search.org ? Number(search.org) : null,
          category: search.category,
          assignee: search.assignee,
          view: search.view,
        },
      }),
  });

  const [layout, setLayout] = useViewMode("mts-tickets-view");

  function setSearch(partial: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...partial }) });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Zendesk"
        title="Tickets"
        description="Unresolved work, saved views, and the conversation stay tied to Zendesk when the account is connected."
      />
      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-between">
      <div className="flex flex-wrap justify-center gap-2 md:justify-start">
        {VIEWS.map((view) => (
          <button
            key={view || "all-views"}
            type="button"
            onClick={() => setSearch({ view })}
            className={
              search.view === view
                ? "h-9 rounded-md bg-accent px-3 text-sm text-accent-fg"
                : "h-9 rounded-md border border-line bg-surface px-3 text-sm"
            }
          >
            {view || "All views"}
          </button>
        ))}
      </div>
      <ViewSwitch mode={layout} onChange={setLayout} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={search.status} onChange={(event) => setSearch({ status: event.target.value })} aria-label="Status">
          <option value="unresolved">Unresolved</option>
          <option value="new">New</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="solved">Solved and closed</option>
          <option value="all">Every status</option>
        </Select>
        <Select value={search.org} onChange={(event) => setSearch({ org: event.target.value })} aria-label="Company">
          <option value="">All companies</option>
          {query.data?.orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </Select>
        <Select value={search.category} onChange={(event) => setSearch({ category: event.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {query.data?.categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={search.assignee} onChange={(event) => setSearch({ assignee: event.target.value })} aria-label="Assignee">
          <option value="">Anyone</option>
          {query.data?.assignees.map((assignee) => (
            <option key={assignee}>{assignee}</option>
          ))}
        </Select>
      </div>
      {query.isPending ? <Loading /> : null}
      {query.isError ? <ErrorNote message={query.error.message} /> : null}
      {query.data ? (
        layout === "grid" ? (
          <div className="grid justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch xl:grid-cols-3">
            {query.data.tickets.length === 0 ? <p className="text-sm text-muted sm:col-span-2 xl:col-span-3">No tickets match this view.</p> : null}
            {query.data.tickets.map((ticket) => (
              <Link key={ticket.id} to="/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="grid w-full max-w-md justify-items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center sm:max-w-none sm:justify-items-start sm:text-left">
                <StatusBadge value={ticket.status} />
                <p className="font-semibold">{ticket.subject}</p>
                <p className="text-xs text-muted">{ticket.organizationName || "No company"} · {ticket.assignee || "Unassigned"}</p>
                <p className="text-xs text-muted">{ticket.zendeskId ? `#${ticket.zendeskId}` : `P-${ticket.id}`} · {ago(ticket.updatedAt)}</p>
              </Link>
            ))}
          </div>
        ) : (
        <>
        <ul className="grid gap-2 md:hidden">
          {query.data.tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link to="/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span>
                  <span className="block font-semibold">{ticket.subject}</span>
                  <span className="mt-0.5 block text-xs text-muted">{ticket.organizationName || "No company"} · {ago(ticket.updatedAt)}</span>
                </span>
                <StatusBadge value={ticket.status} />
              </Link>
            </li>
          ))}
          {query.data.tickets.length === 0 ? <li className="py-6 text-center text-sm text-muted">No tickets match this view.</li> : null}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Requester</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data.tickets.length === 0 ? (
                <tr>
                  <td className="stack-empty px-4 py-8 text-muted" colSpan={11}>
                    No tickets match this view.
                  </td>
                </tr>
              ) : null}
              {query.data.tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-xs" data-label="ID">{ticket.zendeskId ? `#${ticket.zendeskId}` : `P-${ticket.id}`}</td>
                  <td className="px-4 py-3" data-label="Subject">
                    <Link to="/tickets/$ticketId" params={{ ticketId: String(ticket.id) }} className="font-medium hover:underline">
                      {ticket.subject}
                    </Link>
                    {ticket.category ? <p className="mt-1 text-xs text-muted">{ticket.category}</p> : null}
                  </td>
                  <td className="px-4 py-3" data-label="Requester">
                    <p>{ticket.requesterName || "—"}</p>
                    <p className="text-xs text-muted">{ticket.requesterEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-muted" data-label="Requested">{day(ticket.createdAt)}</td>
                  <td className="px-4 py-3 text-muted" data-label="Updated">{ago(ticket.updatedAt)}</td>
                  <td className="px-4 py-3 capitalize" data-label="Channel">{ticket.channel || "—"}</td>
                  <td className="px-4 py-3" data-label="Group">{ticket.groupName || ticket.viewLabel || "—"}</td>
                  <td className="px-4 py-3" data-label="Assignee">{ticket.assignee || "Unassigned"}</td>
                  <td className="px-4 py-3 capitalize" data-label="Type">{ticket.ticketType || "—"}</td>
                  <td className="px-4 py-3 capitalize" data-label="Priority">{ticket.priority || "—"}</td>
                  <td className="px-4 py-3" data-label="Status">
                    <StatusBadge value={ticket.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )
      ) : null}
    </div>
  );
}
