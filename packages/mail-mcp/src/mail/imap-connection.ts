import { ImapFlow, type MailboxObject } from "imapflow";
import type { ImapConfig } from "../config";

export function createClient(imap: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: true,
    auth: { user: imap.login, pass: imap.password },
    logger: false,
  });
}

// One short-lived connection per operation. Connecting per call costs a little
// latency but keeps each request its own failure domain — a hung or dropped
// socket can never poison a later request (this server is stateless per call).
export async function withClient<T>(
  imap: ImapConfig,
  run: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = createClient(imap);
  await client.connect();
  try {
    return await run(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // Best-effort close; the connection may already be gone.
    }
  }
}

export function mailboxCount(client: ImapFlow): number {
  const mailbox = client.mailbox as MailboxObject | boolean;
  return mailbox && typeof mailbox !== "boolean" ? mailbox.exists : 0;
}
