import { createFileRoute } from "@tanstack/react-router";
import { CampaignAdmin } from "@/routes/_app/campaigns";

export const Route = createFileRoute("/production/admin-portal/campaigns")({
  component: CampaignAdmin,
});
