import { createFileRoute } from "@tanstack/react-router";
import { OrderPage } from "@/routes/portal/shop";

export const Route = createFileRoute("/production/user-portal/shop")({
  component: OrderPage,
});
