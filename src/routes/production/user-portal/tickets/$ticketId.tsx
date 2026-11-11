import { createFileRoute } from "@tanstack/react-router";
import { TicketDetail } from "@/routes/portal/tickets/$ticketId";

export const Route = createFileRoute("/production/user-portal/tickets/$ticketId")({
  component: TicketDetail,
});
