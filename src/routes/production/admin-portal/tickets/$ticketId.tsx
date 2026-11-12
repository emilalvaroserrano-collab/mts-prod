import { createFileRoute } from "@tanstack/react-router";
import { TicketPage } from "@/routes/_app/tickets/$ticketId";

export const Route = createFileRoute("/production/admin-portal/tickets/$ticketId")({
  component: TicketPage,
});
