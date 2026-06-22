import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_TTL_SEC = 3600;
const JWT_ALGORITHM = "HS256" as const;

interface MailMcpTokenPayload {
  sub: "mail-mcp-service";
  api_key: string;
}

function getJwtSecret(): string {
  const secret = process.env.MAIL_MCP_JWT_SECRET;
  if (!secret)
    throw new Error("MAIL_MCP_JWT_SECRET environment variable is not set");
  return secret;
}

export function signMcpAccessToken(apiKey: string): string {
  return jwt.sign(
    { sub: "mail-mcp-service", api_key: apiKey } satisfies MailMcpTokenPayload,
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL_SEC, algorithm: JWT_ALGORITHM },
  );
}

export function verifyMcpAccessToken(token: string): MailMcpTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    }) as MailMcpTokenPayload;
  } catch {
    return null;
  }
}
