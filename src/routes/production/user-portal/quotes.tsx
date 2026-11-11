import { createFileRoute } from "@tanstack/react-router";
import { QuotesPage } from "@/routes/portal/quotes";

export const Route = createFileRoute("/production/user-portal/quotes")({
  component: QuotesPage,
});
