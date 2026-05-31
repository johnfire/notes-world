#!/usr/bin/env node
// Generates packages/web/public/changelog.json from the last 40 git commits.
// Run before `npm run build` so the file is bundled into the static site.
import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "packages/web/public/changelog.json");

// Use tab as field separator — safe against special chars in messages.
const raw = execSync('git log -40 --pretty=format:"%H\t%s\t%aI"', {
  cwd: root,
}).toString("utf8");

const entries = raw
  .trim()
  .split("\n")
  .map((line) => {
    const [hash, message, date] = line.split("\t");
    if (!hash || !message) return null;
    return { hash: hash.slice(0, 7), message, date };
  })
  .filter(Boolean);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(entries, null, 2));
console.log(`changelog.json: wrote ${entries.length} entries`);
