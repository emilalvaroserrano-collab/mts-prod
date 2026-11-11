export const MTS_AUTH_CLIENT = "mts-auth";
export const MTS_AUTH_ORIGIN = "https://mts.192-888-702-801.site";

export function oauthUrls(origin = MTS_AUTH_ORIGIN) {
  const base = origin.replace(/\/$/, "");
  return {
    authorizeUrl: `${base}/api/oauth/authorize`,
    tokenUrl: `${base}/api/oauth/token`,
  };
}

export function redirectAllowed(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return url.protocol === "http:" || url.protocol === "https:";
    if (url.protocol !== "https:") return false;
    return host === "mts.192-888-702-801.site" || host.endsWith(".zendesk.com") || host.endsWith(".zdusercontent.com");
  } catch {
    return false;
  }
}
