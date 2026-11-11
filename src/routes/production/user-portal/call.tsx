import { createFileRoute } from "@tanstack/react-router";
import { CallDesk } from "@/routes/portal/call";

export const Route = createFileRoute("/production/user-portal/call")({
  component: CallDesk,
});
