import { api } from "./client";

// Full account export (same payload as the web "Export" button). Returned as
// JSON; the caller is responsible for sharing/saving it.
export function exportAll(): Promise<unknown> {
  return api.get<unknown>("/export/all");
}
