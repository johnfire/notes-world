import MailComposer from "nodemailer/lib/mail-composer";

export const DRAFT_TAG_HEADER = "X-Drafted-By";
export const DRAFT_TAG_VALUE = "claude-mail-mcp";

export interface DraftFields {
  from: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string[];
}

// Build an RFC822 message WITHOUT sending it. MailComposer is nodemailer's MIME
// builder with no transport attached, so there is no code path that could send.
export function buildDraftMime(fields: DraftFields): Promise<Buffer> {
  const composer = new MailComposer({
    from: fields.from,
    to: fields.to,
    cc: fields.cc,
    bcc: fields.bcc,
    subject: fields.subject,
    text: fields.body,
    inReplyTo: fields.inReplyTo,
    references:
      fields.references && fields.references.length
        ? fields.references
        : undefined,
    headers: { [DRAFT_TAG_HEADER]: DRAFT_TAG_VALUE },
  });

  return new Promise((resolve, reject) => {
    composer
      .compile()
      .build((err, message) => (err ? reject(err) : resolve(message)));
  });
}

const EMAIL_PATTERN = /[^\s<>,;"]+@[^\s<>,;"]+/g;

export function extractEmails(text: string): string[] {
  if (!text) return [];
  return text.match(EMAIL_PATTERN) ?? [];
}

export function ensureReSubject(subject: string | null | undefined): string {
  const base = (subject ?? "").trim();
  if (!base) return "Re:";
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

export function buildReferences(
  originalReferences: string[],
  originalMessageId: string | null,
): string[] {
  const references = [...originalReferences];
  if (originalMessageId && !references.includes(originalMessageId))
    references.push(originalMessageId);
  return references;
}

// Pick which of our own identities an incoming message was addressed to, so a
// reply goes out from the right alias. Falls back to the primary mailbox.
export function resolveReplyFrom(
  toText: string,
  ccText: string,
  allowedFrom: string[],
  fallback: string,
): string {
  const canonical = new Map(
    allowedFrom.map((address) => [address.toLowerCase(), address]),
  );
  for (const email of [...extractEmails(toText), ...extractEmails(ccText)]) {
    const match = canonical.get(email.toLowerCase());
    if (match) return match;
  }
  return fallback;
}

// Validate an explicitly requested From against the allow-list. Returns the
// canonical spelling, the fallback when none was requested, or null when the
// requested address is not an allowed identity (caller surfaces the error).
export function resolveFrom(
  requested: string | undefined,
  allowedFrom: string[],
  fallback: string,
): string | null {
  if (!requested) return fallback;
  const match = allowedFrom.find(
    (address) => address.toLowerCase() === requested.toLowerCase(),
  );
  return match ?? null;
}

// Recipients for a reply-all Cc: everyone on the original To/Cc except our own
// identities (never Cc ourselves) and duplicates.
export function collectReplyAllCc(
  toText: string,
  ccText: string,
  ownAddresses: string[],
): string {
  const own = new Set(ownAddresses.map((address) => address.toLowerCase()));
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const email of [...extractEmails(toText), ...extractEmails(ccText)]) {
    const lower = email.toLowerCase();
    if (own.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    recipients.push(email);
  }
  return recipients.join(", ");
}

export function quoteText(
  text: string,
  fromText: string,
  dateIso: string | null,
): string {
  const when = dateIso ? new Date(dateIso).toUTCString() : "an earlier message";
  const who = fromText || "someone";
  const quoted = (text ?? "")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `On ${when}, ${who} wrote:\n${quoted}`;
}
