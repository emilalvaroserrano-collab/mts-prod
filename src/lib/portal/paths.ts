const ADMIN_ROOTS = [
  "/notifications",
  "/tickets",
  "/orders",
  "/organizations",
  "/users",
  "/access",
  "/campaigns",
  "/services",
  "/products",
  "/payments",
  "/forms",
  "/roles",
  "/integrations",
  "/settings",
  "/docs",
];

/** Keep the old admin desk inside /production/admin-portal. */
export function rewriteAdminPath(pathname: string): string | null {
  if (pathname === "/dashboard") return "/production/admin-portal";
  if (pathname.startsWith("/dashboard/")) return `/production/admin-portal${pathname.slice("/dashboard".length)}`;
  for (const root of ADMIN_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) return `/production/admin-portal${pathname}`;
  }
  return null;
}
export function rewriteProductionPath(pathname: string): string | null {
  if (pathname === "/portal") return "/production/user-portal";
  if (pathname.startsWith("/portal/")) return `/production/user-portal${pathname.slice("/portal".length)}`;
  const store = pathname.match(/^\/store\/[^/]+(\/.*)?$/);
  if (!store) return null;
  const rest = store[1] || "";
  if (!rest || rest === "/") return "/production/user-portal/shop";
  if (rest === "/checkout") return "/production/user-portal/checkout";
  if (rest === "/account") return "/production/user-portal/account";
  if (rest === "/tickets" || rest.startsWith("/tickets/")) return `/production/user-portal${rest}`;
  if (rest === "/services" || rest.startsWith("/services/")) return `/production/user-portal${rest}`;
  const sku = rest.replace(/^\//, "");
  if (sku && !sku.includes("/")) return `/production/user-portal/product/${sku}`;
  return "/production/user-portal/shop";
}

export function catalogHref(slug: string, sku: string) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/production/user-portal")) {
    return `/production/user-portal/product/${encodeURIComponent(sku)}`;
  }
  return `/store/${slug}/${sku}`;
}

export function checkoutHref(slug: string) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/production/user-portal")) {
    return "/production/user-portal/checkout";
  }
  return `/store/${slug}/checkout`;
}
