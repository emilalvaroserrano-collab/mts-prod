import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/routes/_app/notifications/index";

export const Route = createFileRoute("/production/admin-portal/notifications/")({
  component: NotificationsPage,
});
