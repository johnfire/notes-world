import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export interface ImapConfig {
  host: string;
  port: number;
  login: string;
  password: string;
}

export interface MailMcpConfig {
  port: number;
  baseUrl: string;
  oauthClientId: string;
  apiKey: string;
  imap: ImapConfig;
  mailboxAddress: string;
  allowedFrom: string[];
}

// The unified inbox can be sent-as several aggregated addresses. The primary
// mailbox address is always a valid identity, so guarantee it is in the list.
function parseAllowedFrom(raw: string, mailboxAddress: string): string[] {
  const identities = raw
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const hasPrimary = identities.some(
    (address) => address.toLowerCase() === mailboxAddress.toLowerCase(),
  );
  if (!hasPrimary) identities.unshift(mailboxAddress);
  return identities;
}

export function loadConfig(): MailMcpConfig {
  // Consumed lazily by oauth/tokens.ts — validate here so we fail fast at boot.
  requireEnv("MAIL_MCP_JWT_SECRET");
  const mailboxAddress = requireEnv("MAILBOX_ADDRESS");

  return {
    port: parseInt(process.env.MAIL_MCP_PORT ?? "3003", 10),
    baseUrl: requireEnv("MAIL_MCP_BASE_URL"),
    oauthClientId: requireEnv("MAIL_MCP_OAUTH_CLIENT_ID"),
    apiKey: requireEnv("MAIL_MCP_API_KEY"),
    imap: {
      host: requireEnv("IMAP_HOST"),
      port: parseInt(process.env.IMAP_PORT ?? "993", 10),
      login: requireEnv("IMAP_LOGIN"),
      password: requireEnv("IMAP_PASSWORD"),
    },
    mailboxAddress,
    allowedFrom: parseAllowedFrom(
      process.env.MAIL_MCP_ALLOWED_FROM ?? "",
      mailboxAddress,
    ),
  };
}
