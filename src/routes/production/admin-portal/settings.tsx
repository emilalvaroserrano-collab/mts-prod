import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/routes/_app/settings";

export const Route = createFileRoute("/production/admin-portal/settings")({
  component: SettingsPage,
});
