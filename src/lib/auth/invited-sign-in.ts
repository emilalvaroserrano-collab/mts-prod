import { createServerFn } from "@tanstack/react-start";

export const signInWithInvitation = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = input && typeof input === "object" ? (input as { email?: unknown; password?: unknown }) : {};
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";
    if (!email.includes("@") || password.length < 8) throw new Error("Enter the email and password from your invitation.");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const { auth } = await import("./server");
    const { findZendeskInvite } = await import("./zendesk-invite");
    const invited = await findZendeskInvite(data.email);
    if (!invited) throw new Error("Check the email from your invitation and try again.");
    const headers = getRequestHeaders();
    try {
      await auth.api.signInEmail({
        body: { email: invited.email, password: data.password, rememberMe: true },
        headers,
      });
      return { ok: true as const };
    } catch {
      try {
        await auth.api.signUpEmail({
          body: { email: invited.email, password: data.password, name: invited.name },
          headers,
        });
        return { ok: true as const };
      } catch {
        throw new Error("Email or password is incorrect.");
      }
    }
  });
