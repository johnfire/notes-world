import { simpleParser, type AddressObject } from "mailparser";
import type { ImapConfig } from "../config";
import { withClient, mailboxCount } from "./imap-connection";
import {
  type MessageSummary,
  toSummary,
  normalizeReferences,
} from "./message-summary";

export interface FullMessage extends MessageSummary {
  cc: string;
  references: string[];
  text: string;
}

export interface SearchCriteria {
  from?: string;
  subject?: string;
  text?: string;
  since?: string;
  unreadOnly?: boolean;
}

const SEARCH_RESULT_CAP = 50;

export async function listMessages(
  imap: ImapConfig,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<MessageSummary[]> {
  const limit = options.limit ?? 20;
  return withClient(imap, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = mailboxCount(client);
      if (total === 0) return [];
      const start = Math.max(1, total - limit + 1);
      const summaries: MessageSummary[] = [];
      for await (const message of client.fetch(`${start}:*`, {
        envelope: true,
        flags: true,
        uid: true,
      })) {
        if (options.unreadOnly && message.flags?.has("\\Seen")) continue;
        summaries.push(toSummary(message));
      }
      return summaries.reverse();
    } finally {
      lock.release();
    }
  });
}

export async function searchMessages(
  imap: ImapConfig,
  criteria: SearchCriteria,
): Promise<MessageSummary[]> {
  return withClient(imap, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const query: Record<string, unknown> = {};
      if (criteria.from) query.from = criteria.from;
      if (criteria.subject) query.subject = criteria.subject;
      if (criteria.text) query.body = criteria.text;
      if (criteria.since) query.since = new Date(criteria.since);
      if (criteria.unreadOnly) query.seen = false;

      const uids = await client.search(query, { uid: true });
      if (!uids || uids.length === 0) return [];
      const recentUids = uids.slice(-SEARCH_RESULT_CAP);

      const summaries: MessageSummary[] = [];
      for await (const message of client.fetch(
        recentUids,
        { envelope: true, flags: true, uid: true },
        { uid: true },
      )) {
        summaries.push(toSummary(message));
      }
      return summaries.reverse();
    } finally {
      lock.release();
    }
  });
}

function addressText(
  address: AddressObject | AddressObject[] | undefined,
): string {
  if (!address) return "";
  if (Array.isArray(address))
    return address.map((entry) => entry.text).filter(Boolean).join(", ");
  return address.text ?? "";
}

// ImapFlow fetches message bodies with BODY.PEEK, so reading does NOT set the
// \Seen flag — the inbox is left untouched, honouring the read-only guarantee.
export async function getMessage(
  imap: ImapConfig,
  uid: number,
): Promise<FullMessage | null> {
  return withClient(imap, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const message = await client.fetchOne(
        String(uid),
        { source: true, envelope: true, flags: true },
        { uid: true },
      );
      if (!message || !message.source) return null;

      const parsed = await simpleParser(message.source);
      return {
        uid,
        from: parsed.from?.text ?? "",
        to: addressText(parsed.to),
        cc: addressText(parsed.cc),
        subject: parsed.subject ?? "",
        date: parsed.date ? parsed.date.toISOString() : null,
        messageId: parsed.messageId ?? null,
        references: normalizeReferences(parsed.references),
        text: parsed.text ?? "",
        unread: !message.flags?.has("\\Seen"),
      };
    } finally {
      lock.release();
    }
  });
}
