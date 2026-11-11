import { createFileRoute } from "@tanstack/react-router";
import { handleOauthToken } from "@/lib/portal/mts-oauth";

export const Route = createFileRoute("/api/oauth/token")({
  server: {
    handlers: {
      POST: ({ request }) => handleOauthToken(request),
      OPTIONS: ({ request }) => handleOauthToken(request),
    },
  },
});
