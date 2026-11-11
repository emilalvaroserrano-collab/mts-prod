import { createFileRoute } from "@tanstack/react-router";
import { Checkout } from "@/routes/store/$slug/checkout";

export const Route = createFileRoute("/production/user-portal/checkout")({
  component: Checkout,
});
