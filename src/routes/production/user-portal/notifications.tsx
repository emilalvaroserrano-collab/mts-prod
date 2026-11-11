import { createFileRoute } from "@tanstack/react-router";
import { NoticesPage } from "@/routes/portal/notifications";

export const Route = createFileRoute("/production/user-portal/notifications")({
  component: NoticesPage,
});
