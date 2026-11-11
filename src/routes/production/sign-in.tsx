import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/production/sign-in")({
  component: () => <Navigate to="/production/signin" />,
});
