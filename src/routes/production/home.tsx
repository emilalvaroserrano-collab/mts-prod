import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/production/home")({
  component: () => <Navigate to="/production/user-portal" />,
});
