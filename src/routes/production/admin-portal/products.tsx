import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/routes/_app/products";

export const Route = createFileRoute("/production/admin-portal/products")({
  component: ProductsPage,
});
