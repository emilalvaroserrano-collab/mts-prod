import { createFileRoute } from "@tanstack/react-router";
import { CampaignsPage } from "@/routes/portal/campaigns";

export const Route = createFileRoute("/production/user-portal/campaigns")({
  component: CampaignsPage,
});
