import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Navigate, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { rewriteProductionPath } from "@/lib/portal/paths";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Manage Tech Service" },
      { name: "description", content: "Technology that drives business success." },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootComponent,
});

function EntryGate() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const fromProduction = typeof window !== "undefined" && sessionStorage.getItem("mts-production-portal") === "1";
  const rewritten = fromProduction ? rewriteProductionPath(path) : null;
  if (rewritten && rewritten !== path) return <Navigate to={rewritten} replace />;
  const open =
    path === "/" ||
    path === "/upgrade" ||
    path === "/production" ||
    path.startsWith("/production/") ||
    path.startsWith("/api") ||
    path.startsWith("/auth");
  if (!open) return <Navigate to="/upgrade" replace />;
  return <Outlet />;
}

function RootComponent() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <QueryClientProvider client={client}>
            <EntryGate />
            <Toaster position="top-center" />
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
