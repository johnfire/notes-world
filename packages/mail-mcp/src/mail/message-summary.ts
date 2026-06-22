import type { FetchMessageObject } from "imapflow";

export interface MessageSummary {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string | null;
  messageId: string | null;
  unread: boolean;
}

interface EnvelopeAddress {
  name?: string;
  address?: string;
}

export function formatAddresses(list?: EnvelopeAddress[]): string {
  if (!list || list.length === 0) return "";
  return list
    .map((entry) =>
      entry.name ? `${entry.name} <${entry.address ?? ""}>` : entry.address ?? "",
    )
    .filter(Boolean)
    .join(", ");
}

export function normalizeReferences(
  references: string | string[] | null | undefined,
): string[] {
  if (Array.isArray(references)) return references.filter(Boolean);
  if (typeof references === "string")
    return references.split(/\s+/).filter(Boolean);
  return [];
}

export function toSummary(message: FetchMessageObject): MessageSummary {
  const envelope = message.envelope;
  return {
    uid: message.uid,
    from: formatAddresses(envelope?.from),
    to: formatAddresses(envelope?.to),
    subject: envelope?.subject ?? "",
    date: envelope?.date ? envelope.date.toISOString() : null,
    messageId: envelope?.messageId ?? null,
    unread: !message.flags?.has("\\Seen"),
  };
}
