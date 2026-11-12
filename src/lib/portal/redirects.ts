/** Public addresses that should not render their own page. */
export function publicRedirect(pathname: string): string | null {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (
    path === "/" ||
    path === "/production" ||
    path === "/login" ||
    path === "/portal/login" ||
    path === "/portal/register" ||
    path === "/production/sign-in"
  ) {
    return "/production/signin";
  }
  if (path === "/production/home") return "/production/user-portal";
  return null;
}
