import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/routes/_app/payments";

export const Route = createFileRoute("/production/admin-portal/payments")({
  component: PaymentsPage,
});
