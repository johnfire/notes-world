import { describe, it, expect } from "vitest";
import { buildSearchQuery } from "./inbox-reader";

describe("buildSearchQuery", () => {
  it("is empty when no criteria are given", () => {
    expect(buildSearchQuery({})).toEqual({});
  });

  it("maps `to` to the ImapFlow recipient query (the tasks@ alias filter)", () => {
    expect(buildSearchQuery({ to: "tasks@christopherrehm.de" })).toEqual({
      to: "tasks@christopherrehm.de",
    });
  });

  it("maps from/subject/text and combines them with `to`", () => {
    expect(
      buildSearchQuery({
        from: "recruiter@example.com",
        to: "tasks@christopherrehm.de",
        subject: "Interview",
        text: "Tuesday",
      }),
    ).toEqual({
      from: "recruiter@example.com",
      to: "tasks@christopherrehm.de",
      subject: "Interview",
      body: "Tuesday",
    });
  });

  it("converts `since` to a Date and sets seen:false for unreadOnly", () => {
    const query = buildSearchQuery({ since: "2026-06-01", unreadOnly: true });
    expect(query.since).toBeInstanceOf(Date);
    expect((query.since as Date).toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(query.seen).toBe(false);
  });

  it("omits `seen` when unreadOnly is false", () => {
    expect(buildSearchQuery({ unreadOnly: false })).toEqual({});
  });
});
