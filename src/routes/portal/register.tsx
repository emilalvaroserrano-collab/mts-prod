import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/register")({
  beforeLoad: () => {
    throw redirect({ href: "/production/signin", replace: true });
  },
});
