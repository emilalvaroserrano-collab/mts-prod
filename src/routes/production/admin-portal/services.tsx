import { createFileRoute } from "@tanstack/react-router";
import { ServicesDesk } from "@/routes/_app/services";

export const Route = createFileRoute("/production/admin-portal/services")({
  component: ServicesDesk,
});
