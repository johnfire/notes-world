import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MailMcpConfig } from "../config";
import {
  buildDraftMime,
  ensureReSubject,
  buildReferences,
  resolveFrom,
  resolveReplyFrom,
  collectReplyAllCc,
  quoteText,
} from "../mail/draft-builder";
import { appendDraft, listDrafts, deleteDraft } from "../mail/drafts-writer";
import { getMessage } from "../mail/inbox-reader";
import { ok, fail } from "./tool-response";

// Every write here lands in the Drafts folder only. There is deliberately no
// "send" tool — the human reviews and sends from their mail client.
export function registerDraftTools(
  server: McpServer,
  config: MailMcpConfig,
): void {
  const identities = config.allowedFrom.join(", ");

  server.tool(
    "create_draft",
    "Create a new email draft in the Drafts folder for the user to review and send manually. This never sends mail. From defaults to the primary address and must be one of the allowed identities.",
    {
      to: z.string().describe("Recipient(s), comma-separated"),
      subject: z.string(),
      body: z.string().describe("Plain-text body"),
      from: z
        .string()
        .optional()
        .describe(`Sender identity; one of: ${identities}`),
      cc: z.string().optional().describe("Cc recipient(s), comma-separated"),
      bcc: z.string().optional().describe("Bcc recipient(s), comma-separated"),
    },
    async ({ to, subject, body, from, cc, bcc }) => {
      try {
        const sender = resolveFrom(from, config.allowedFrom, config.mailboxAddress);
        if (!sender)
          return fail(
            "create_draft",
            new Error(`from must be one of: ${identities}`),
          );
        const mime = await buildDraftMime({ from: sender, to, cc, bcc, subject, body });
        await appendDraft(config.imap, mime);
        return ok({ status: "draft saved to Drafts", from: sender, to, subject });
      } catch (err) {
        return fail("create_draft", err);
      }
    },
  );

  server.tool(
    "draft_reply",
    "Draft an in-thread reply to an inbox message (by UID) into the Drafts folder for review. Never sends. Auto-selects the From (the alias the original was addressed to), sets reply-threading headers, and quotes the original.",
    {
      uid: z.number().describe("UID of the inbox message to reply to"),
      body: z.string().describe("Your reply text; the original is quoted below it automatically"),
      reply_all: z
        .boolean()
        .optional()
        .default(false)
        .describe("Cc the other original recipients too"),
    },
    async ({ uid, body, reply_all }) => {
      try {
        const original = await getMessage(config.imap, uid);
        if (!original)
          return fail("draft_reply", new Error(`No message with UID ${uid}`));

        const sender = resolveReplyFrom(
          original.to,
          original.cc,
          config.allowedFrom,
          config.mailboxAddress,
        );
        const cc = reply_all
          ? collectReplyAllCc(original.to, original.cc, config.allowedFrom)
          : undefined;
        const mime = await buildDraftMime({
          from: sender,
          to: original.from,
          cc: cc || undefined,
          subject: ensureReSubject(original.subject),
          body: `${body}\n\n${quoteText(original.text, original.from, original.date)}`,
          inReplyTo: original.messageId ?? undefined,
          references: buildReferences(original.references, original.messageId),
        });
        await appendDraft(config.imap, mime);
        return ok({
          status: "reply draft saved to Drafts",
          from: sender,
          to: original.from,
          subject: ensureReSubject(original.subject),
        });
      } catch (err) {
        return fail("draft_reply", err);
      }
    },
  );

  server.tool(
    "list_drafts",
    "List drafts currently in the Drafts folder (newest first).",
    {
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Max drafts to return (default 20)"),
    },
    async ({ limit }) => {
      try {
        return ok(await listDrafts(config.imap, limit));
      } catch (err) {
        return fail("list_drafts", err);
      }
    },
  );

  server.tool(
    "delete_draft",
    "Delete a draft from the Drafts folder by its UID. Operates only on Drafts — it cannot touch the inbox.",
    { uid: z.number().describe("Draft UID from list_drafts") },
    async ({ uid }) => {
      try {
        const deleted = await deleteDraft(config.imap, uid);
        return ok({ deleted, uid });
      } catch (err) {
        return fail("delete_draft", err);
      }
    },
  );
}
