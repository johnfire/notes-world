jest.mock("../../../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));

import request from "supertest";
import { createApp } from "../../../../../packages/server/src/app";

const app = createApp();

// The self-hosted sideload APK was retired in favour of Play closed-testing
// (CI auto-publishes there). The version endpoint must send the in-app update
// prompt to Play, never to a dead /downloads/*.apk path (which 404s).
describe("GET /api/mobile/version", () => {
  it("sends users to the Play testing track, not a sideload APK", async () => {
    const res = await request(app).get("/api/mobile/version");
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe(
      "https://play.google.com/apps/testing/notes.world",
    );
    expect(res.body.downloadUrl).not.toMatch(/\.apk$/);
  });
});
