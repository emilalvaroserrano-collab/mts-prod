import { createFileRoute } from "@tanstack/react-router";
import { NewTicket } from "@/routes/portal/tickets/new";

export const Route = createFileRoute("/production/user-portal/tickets/new")({
  component: NewTicket,
});
