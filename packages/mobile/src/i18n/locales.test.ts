import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPPORTED_LANGUAGE_CODES } from "./languages";

const LOCALES_DIR = join(__dirname, "locales");

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flattenKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

function load(code: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALES_DIR, `${code}.json`), "utf8"));
}

const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

const enKeys = flattenKeys(load("en")).sort();

describe("mobile i18n locales", () => {
  it("has a locale file for every supported language and vice versa", () => {
    expect([...SUPPORTED_LANGUAGE_CODES].sort()).toEqual(
      [...localeFiles].sort(),
    );
  });

  for (const code of localeFiles) {
    if (code === "en") continue;
    it(`${code}.json has the same keys as en.json`, () => {
      expect(flattenKeys(load(code)).sort()).toEqual(enKeys);
    });
  }

  it("preserves interpolation placeholders in every locale", () => {
    for (const code of localeFiles) {
      const data = load(code) as {
        item: { updated: string };
        account: { proPlanBanner: string };
      };
      expect(data.item.updated).toContain("{{date}}");
      expect(data.account.proPlanBanner).toContain("{{status}}");
    }
  });
});
