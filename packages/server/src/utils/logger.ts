import fs from "fs";
import path from "path";

/**
 * Minimal structured logger. Writes one JSON line per event to the console
 * (captured by Docker) and, when LOG_DIR is set, appends to a persistent
 * `notes-world.log` there — the master log on the VPS. No external dependency.
 */
const LOG_DIR = process.env.LOG_DIR;
let fileStream: fs.WriteStream | null = null;

if (LOG_DIR) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fileStream = fs.createWriteStream(path.join(LOG_DIR, "notes-world.log"), {
      flags: "a",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Logger: could not open log file in", LOG_DIR, err);
  }
}

type Level = "info" | "warn" | "error";

function write(
  level: Level,
  msg: string,
  meta?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  });
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(line);
  fileStream?.write(line + "\n");
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    write("error", msg, meta),
};
