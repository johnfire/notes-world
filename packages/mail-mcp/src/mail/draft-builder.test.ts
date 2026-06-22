import { describe, it, expect } from "vitest";
import {
  buildDraftMime,
  ensureReSubject,
  buildReferences,
  resolveFrom,
  resolveReplyFrom,
  collectReplyAllCc,
  extractEmails,
  quoteText,
  DRAFT_TAG_HEADER,
} from "./draft-builder";

const IDENTITIES = [
  "contact@christopherrehm.de",
  "christopher@leguilde.art",
  "contact@leguilde.art",
  "contact@tandkcybernetics.net",
];
const PRIMARY = "contact@christopherrehm.de";

describe("ensureReSubject", () => {
  it("prefixes Re: when missing", () => {
    expect(ensureReSubject("Invoice")).toBe("Re: Invoice");
  });
  it("does not double an existing Re:", () => {
    expect(ensureReSubject("Re: Invoice")).toBe("Re: Invoice");
    expect(ensureReSubject("RE: Invoice")).toBe("RE: Invoice");
  });
  it("handles empty/undefined", () => {
    expect(ensureReSubject("")).toBe("Re:");
    expect(ensureReSubject(undefined)).toBe("Re:");
  });
});

describe("buildReferences", () => {
  it("appends the original message id", () => {
    expect(buildReferences(["<a@x>"], "<b@x>")).toEqual(["<a@x>", "<b@x>"]);
  });
  it("does not duplicate an id already present", () => {
    expect(buildReferences(["<a@x>", "<b@x>"], "<b@x>")).toEqual([
      "<a@x>",
      "<b@x>",
    ]);
  });
  it("tolerates a null message id and empty refs", () => {
    expect(buildReferences([], null)).toEqual([]);
  });
});

describe("resolveFrom", () => {
  it("returns the fallback when nothing requested", () => {
    expect(resolveFrom(undefined, IDENTITIES, PRIMARY)).toBe(PRIMARY);
  });
  it("accepts an allowed identity case-insensitively", () => {
    expect(resolveFrom("Contact@LeGuilde.art", IDENTITIES, PRIMARY)).toBe(
      "contact@leguilde.art",
    );
  });
  it("rejects an address outside the allow-list", () => {
    expect(resolveFrom("evil@example.com", IDENTITIES, PRIMARY)).toBeNull();
  });
});

describe("resolveReplyFrom", () => {
  it("replies from the alias the mail was addressed to", () => {
    const from = resolveReplyFrom(
      "Someone <contact@leguilde.art>",
      "",
      IDENTITIES,
      PRIMARY,
    );
    expect(from).toBe("contact@leguilde.art");
  });
  it("looks in Cc as well as To", () => {
    const from = resolveReplyFrom(
      "other@somewhere.com",
      "contact@tandkcybernetics.net",
      IDENTITIES,
      PRIMARY,
    );
    expect(from).toBe("contact@tandkcybernetics.net");
  });
  it("falls back to the primary when no identity matches", () => {
    expect(resolveReplyFrom("stranger@x.com", "", IDENTITIES, PRIMARY)).toBe(
      PRIMARY,
    );
  });
});

describe("extractEmails / collectReplyAllCc", () => {
  it("extracts bare and angle-bracketed addresses", () => {
    expect(extractEmails("A <a@x.com>, b@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });
  it("excludes our own identities and de-duplicates", () => {
    const cc = collectReplyAllCc(
      "contact@christopherrehm.de, alice@x.com",
      "alice@x.com, bob@y.com",
      IDENTITIES,
    );
    expect(cc).toBe("alice@x.com, bob@y.com");
  });
});

describe("quoteText", () => {
  it("prefixes each line and adds an attribution", () => {
    const quoted = quoteText("line one\nline two", "Bob <bob@x.com>", null);
    expect(quoted).toContain("Bob <bob@x.com> wrote:");
    expect(quoted).toContain("> line one");
    expect(quoted).toContain("> line two");
  });
});

describe("buildDraftMime", () => {
  it("emits the core headers, threading, tag, and body", async () => {
    const mime = (
      await buildDraftMime({
        from: PRIMARY,
        to: "bob@example.com",
        subject: "Re: Hello",
        body: "Hi Bob",
        inReplyTo: "<orig@x>",
        references: ["<root@x>", "<orig@x>"],
      })
    ).toString("utf8");

    expect(mime).toContain(`From: ${PRIMARY}`);
    expect(mime).toContain("To: bob@example.com");
    expect(mime).toContain("Subject: Re: Hello");
    expect(mime).toContain("In-Reply-To: <orig@x>");
    expect(mime).toContain("References: <root@x> <orig@x>");
    expect(mime).toContain(`${DRAFT_TAG_HEADER}: claude-mail-mcp`);
    expect(mime).toContain("Hi Bob");
  });
});
