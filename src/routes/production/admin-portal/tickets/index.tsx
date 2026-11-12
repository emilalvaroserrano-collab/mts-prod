import { createFileRoute } from "@tanstack/react-router";
import { TicketsPage } from "@/routes/_app/tickets/index";
import { ticketSearch } from "@/lib/portal/ticket-search";

export const Route = createFileRoute("/production/admin-portal/tickets/")({
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
