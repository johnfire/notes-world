import { Router } from "express";
import { createAuthCode } from "./store";

export function createAuthorizeRouter(
  clientId: string,
  getNwKey: () => string,
): Router {
  const router = Router();

  // Auto-approve: issues the auth code immediately without a consent page.
  // Safe for a single-user personal app — PKCE makes the code useless without
  // the code_verifier, which only the legitimate client (claude.ai) possesses.
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
    if (!redirect_uri || !redirect_uri.startsWith("https://")) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri must be HTTPS",
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

    const nwKey = getNwKey();
    if (!nwKey) {
      res.status(500).json({ error: "server_error" });
      return;
    }

    const code = createAuthCode({
      code_challenge,
      redirect_uri,
      client_id,
      nw_key: nwKey,
    });

    const dest = new URL(redirect_uri);
    dest.searchParams.set("code", code);
    if (state) dest.searchParams.set("state", state);
    res.redirect(dest.toString());
  });

  return router;
}
