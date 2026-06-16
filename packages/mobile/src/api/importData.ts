import { api } from "./client";
import type { ImportJob } from "@notes-world/shared";

// Import markdown files. Each entry's path folder (if any) becomes a tag,
// matching the web folder import. Flat filenames import untagged.
export function importFolder(
  files: Array<{ path: string; content: string }>,
): Promise<ImportJob> {
  return api.post<ImportJob>("/import/folder", { files });
}
