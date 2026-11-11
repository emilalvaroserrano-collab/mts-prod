import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/routes/portal/account";

export const Route = createFileRoute("/production/user-portal/account")({
  component: AccountPage,
});
