import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MailMcpConfig } from "../config";
import { listMessages, searchMessages, getMessage } from "../mail/inbox-reader";
import { ok, fail } from "./tool-response";

// All three tools are strictly read-only: they only ever FETCH/SEARCH the inbox.
export function registerInboxTools(
  server: McpServer,
  config: MailMcpConfig,
): void {
  server.tool(
    "list_messages",
    "List recent messages from the unified inbox (read-only), newest first. Returns summaries; use get_message for the full body.",
    {
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Max messages to return (default 20)"),
      unread_only: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only return unread messages"),
    },
    async ({ limit, unread_only }) => {
      try {
        const messages = await listMessages(config.imap, {
          limit,
          unreadOnly: unread_only,
        });
        return ok(messages);
      } catch (err) {
        return fail("list_messages", err);
      }
    },
  );

  server.tool(
    "search_messages",
    "Search the unified inbox (read-only) by sender, recipient, subject, body text, and/or a since-date. Returns summaries, newest first.",
    {
      from: z.string().optional().describe("Match the sender address/name"),
      to: z
        .string()
        .optional()
        .describe("Match the recipient address — e.g. an alias like tasks@christopherrehm.de"),
      subject: z.string().optional().describe("Match words in the subject"),
      text: z.string().optional().describe("Match words in the body"),
      since: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Only messages on/after this date, YYYY-MM-DD"),
      unread_only: z.boolean().optional().default(false),
    },
    async ({ from, to, subject, text, since, unread_only }) => {
      try {
        const messages = await searchMessages(config.imap, {
          from,
          to,
          subject,
          text,
          since,
          unreadOnly: unread_only,
        });
        return ok(messages);
      } catch (err) {
        return fail("search_messages", err);
      }
    },
  );

  server.tool(
    "get_message",
    "Get one inbox message in full (headers + plain-text body) by its UID (read-only). Reading does not mark it as seen.",
    { uid: z.number().describe("Message UID from list_messages/search_messages") },
    async ({ uid }) => {
      try {
        const message = await getMessage(config.imap, uid);
        if (!message)
          return fail("get_message", new Error(`No message with UID ${uid}`));
        return ok(message);
      } catch (err) {
        return fail("get_message", err);
      }
    },
  );
}
