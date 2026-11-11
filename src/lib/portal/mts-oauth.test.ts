import assert from "node:assert/strict";
import test from "node:test";
import { oauthUrls, redirectAllowed } from "./mts-oauth-public.ts";

test("mts-auth only redirects back to this portal or Zendesk", () => {
  assert.equal(redirectAllowed("https://mts.192-888-702-801.site/integrations"), true);
  assert.equal(redirectAllowed("https://shop.zendesk.com/integrations/oauth/callback"), true);
  assert.equal(redirectAllowed("https://evil.example/steal"), false);
  assert.equal(redirectAllowed("http://shop.zendesk.com/callback"), false);
});

test("authorize and token urls are not the site root", () => {
  const urls = oauthUrls();
  assert.equal(urls.authorizeUrl, "https://mts.192-888-702-801.site/api/oauth/authorize");
  assert.equal(urls.tokenUrl, "https://mts.192-888-702-801.site/api/oauth/token");
});
