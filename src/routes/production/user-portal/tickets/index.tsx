import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/routes/portal/tickets/index";

export const Route = createFileRoute("/production/user-portal/tickets/")({
  component: TicketList,
});
