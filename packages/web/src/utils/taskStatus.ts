import { TaskStatus } from "../types";

const KNOWN_STATUSES = new Set<string>(Object.values(TaskStatus));

/** True when value is a recognised task status (so callers can gate rendering). */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && KNOWN_STATUSES.has(value);
}
