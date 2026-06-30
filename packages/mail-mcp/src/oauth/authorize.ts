import { Router } from "express";
import { createAuthCode } from "./store";

// An exact-match allowlist is the real guard against a leaked auth code: without
// it, the endpoint 302s a freshly minted code to ANY https URL the caller names.
// When the allowlist is empty (env not configured) we fall back to the weaker
// https-only check so an existing connector keeps working, but index.ts warns at
// startup so the operator knows to lock it down.
function isRedirectAllowed(
  redirectUri: string | undefined,
  allowed: string[],
): redirectUri is string {
  if (!redirectUri) return false;
  if (allowed.length > 0) return allowed.includes(redirectUri);
  return redirectUri.startsWith("https://");
}

export function createAuthorizeRouter(
  clientId: string,
  getApiKey: () => string,
  allowedRedirectUris: string[] = [],
): Router {
  const router = Router();

  // Auto-approve: issues the auth code immediately without a consent page.
  // Safe for a single-user personal app — PKCE makes the code useless without
  // the code_verifier, which only the legitimate client (claude.ai) possesses,
  // and the redirect_uri allowlist below keeps the code from being sent anywhere
  // else.
  router.get("/oauth/authorize", (req, res) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
    } = req.query as Record<string, string | undefined>;

    if (response_type !== "code") {
      res.status(400).json({ error: "unsupported_response_type" });
      return;
    }
    if (client_id !== clientId) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }
    if (!isRedirectAllowed(redirect_uri, allowedRedirectUris)) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri is not allowed",
      });
      return;
    }
    if (code_challenge_method !== "S256" || !code_challenge) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "PKCE S256 is required",
      });
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({ error: "server_error" });
      return;
    }

    const code = createAuthCode({
      code_challenge,
      redirect_uri,
      client_id,
      api_key: apiKey,
    });

    const dest = new URL(redirect_uri);
    dest.searchParams.set("code", code);
    if (state) dest.searchParams.set("state", state);
    res.redirect(dest.toString());
  });

  return router;
}
