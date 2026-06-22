import type { ImapFlow } from "imapflow";
import type { ImapConfig } from "../config";
import { withClient, mailboxCount } from "./imap-connection";
import { type MessageSummary, toSummary } from "./message-summary";

const DEFAULT_DRAFTS_PATH = "Drafts";

// Find the Drafts folder by its IMAP \Drafts special-use flag rather than a
// hardcoded name. On a fresh Maildir that has never had a Drafts folder, create
// one so APPEND has a target; Dovecot tags it \Drafts via its namespace config.
async function resolveDraftsPath(client: ImapFlow): Promise<string> {
  const mailboxes = await client.list();
  const drafts = mailboxes.find((box) => box.specialUse === "\\Drafts");
  if (drafts) return drafts.path;

  const existing = mailboxes.find((box) => box.path === DEFAULT_DRAFTS_PATH);
  if (!existing) await client.mailboxCreate(DEFAULT_DRAFTS_PATH);
  return DEFAULT_DRAFTS_PATH;
}

export async function appendDraft(
  imap: ImapConfig,
  mime: Buffer,
): Promise<void> {
  await withClient(imap, async (client) => {
    const path = await resolveDraftsPath(client);
    await client.append(path, mime, ["\\Draft"]);
  });
}

export async function listDrafts(
  imap: ImapConfig,
  limit = 20,
): Promise<MessageSummary[]> {
  return withClient(imap, async (client) => {
    const path = await resolveDraftsPath(client);
    const lock = await client.getMailboxLock(path);
    try {
      const total = mailboxCount(client);
      if (total === 0) return [];
      const start = Math.max(1, total - limit + 1);
      const drafts: MessageSummary[] = [];
      for await (const message of client.fetch(`${start}:*`, {
        envelope: true,
        flags: true,
        uid: true,
      })) {
        drafts.push(toSummary(message));
      }
      return drafts.reverse();
    } finally {
      lock.release();
    }
  });
}

// Deletion is confined to the Drafts folder: the mailbox is locked to the
// resolved Drafts path, so this can never touch INBOX.
export async function deleteDraft(
  imap: ImapConfig,
  uid: number,
): Promise<boolean> {
  return withClient(imap, async (client) => {
    const path = await resolveDraftsPath(client);
    const lock = await client.getMailboxLock(path);
    try {
      return await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  });
}
