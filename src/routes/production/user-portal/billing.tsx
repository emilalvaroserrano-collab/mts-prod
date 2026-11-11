import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/routes/portal/billing";

export const Route = createFileRoute("/production/user-portal/billing")({
  component: BillingPage,
});
