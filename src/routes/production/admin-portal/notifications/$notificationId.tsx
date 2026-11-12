import { createFileRoute } from "@tanstack/react-router";
import { NotificationPage } from "@/routes/_app/notifications/$notificationId";

export const Route = createFileRoute("/production/admin-portal/notifications/$notificationId")({
  component: NotificationPage,
});
