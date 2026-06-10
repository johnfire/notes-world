import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// The landing-page nav renders t("nav.docs"); a locale missing the key would
// show a raw key or English fallback. Guard every locale has it.
const localesDir = join(dirname(fileURLToPath(import.meta.url)), "locales");

const localeFiles = readdirSync(localesDir).filter((f) => f.endsWith(".json"));

describe("nav.docs translation coverage", () => {
  test("there are locale files to check", () => {
    expect(localeFiles.length).toBeGreaterThan(0);
  });

  test.each(localeFiles)("%s defines a non-empty nav.docs", (file) => {
    const json = JSON.parse(readFileSync(join(localesDir, file), "utf8"));
    expect(typeof json.nav?.docs).toBe("string");
    expect(json.nav.docs.trim().length).toBeGreaterThan(0);
  });
});
