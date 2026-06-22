# @notes-world/mail-mcp

An authenticated MCP server that lets AI agents (Claude cowork, claude.ai, Hermes)
**draft** email into the unified inbox (`contact@christopherrehm.de`) for review.
It **never sends** — you review each draft in SnappyMail and click send yourself.

## Boundaries (by design)

- **No send.** There is no SMTP code and no send tool in this package. The only
  write is IMAP `APPEND` into the **Drafts** folder.
- **Read-only inbox.** Inbox tools only `FETCH`/`SEARCH`; reads use `BODY.PEEK`,
  so messages are not marked seen. (Enforced in code — IMAP has no read-only
  login. Optional hardening: Dovecot ACLs on the master user.)
- **Drafts-only writes.** `create_draft` / `draft_reply` append to Drafts;
  `delete_draft` is locked to the Drafts folder and cannot touch the inbox.
- **Send-as allow-list.** A draft's `From` must be one of `MAIL_MCP_ALLOWED_FROM`.

## Tools

| Tool | Kind | Notes |
| --- | --- | --- |
| `list_messages` | read | Recent inbox summaries, newest first |
| `search_messages` | read | By from / subject / body text / since-date |
| `get_message` | read | Full headers + plain-text body by UID |
| `create_draft` | write (Drafts) | New draft; `from` defaults to the primary address |
| `draft_reply` | write (Drafts) | In-thread reply; auto-picks the right `From`, quotes original |
| `list_drafts` | read (Drafts) | Drafts currently waiting |
| `delete_draft` | write (Drafts) | Remove a draft by UID |

## Auth

Same OAuth 2.1 pattern as `@notes-world/mcp` (discovery → auto-approve authorize
with PKCE → JWT). Clients present either the raw `MAIL_MCP_API_KEY` or a JWT
minted from it. This server holds the IMAP credential itself, so the key only
gates access — there is no downstream API.

## Develop

```bash
cp .env.example .env          # fill in secrets + IMAP master-user password
npm run dev   --workspace=packages/mail-mcp   # ts-node
npm run build --workspace=packages/mail-mcp   # tsc -> dist/
npm run test  --workspace=packages/mail-mcp   # vitest (pure draft-builder logic)
```

## Deployment prerequisites (tracked separately)

These live on the VPS and are **not** part of this package:

1. **Dovecot master user** `mcp-mail` (enable `auth-master`, set
   `auth_master_user_separator = *`, add `/etc/dovecot/master-users`). Lets the
   MCP log in as `contact@christopherrehm.de*mcp-mail` with a revocable
   credential separate from the mailbox password.
2. **Apache vhost** `mcp.mail.christopherrehm.de` → `ProxyPass` to this
   container + a Let's Encrypt cert + a DNS A record → the VPS.
3. **SnappyMail identities** for `christopher@leguilde.art`,
   `contact@leguilde.art`, `contact@tandkcybernetics.net` — otherwise SnappyMail
   may rewrite a draft's `From` to the account address on send.
4. **SPF/DKIM** for the alias domains must be correct or send-as mail will fail
   SPF and land in spam.
