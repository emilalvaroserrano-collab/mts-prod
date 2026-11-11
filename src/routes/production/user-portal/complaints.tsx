import { createFileRoute } from "@tanstack/react-router";
import { ComplaintsPage } from "@/routes/portal/complaints";

export const Route = createFileRoute("/production/user-portal/complaints")({
  component: ComplaintsPage,
});
