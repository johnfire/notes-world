jest.mock("../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));

import request from "supertest";
import { createApp, setStartedAt } from "../../../packages/server/src/app";

const app = createApp();

// /health backs the always-on watchdog. Beyond reachability it reports the
// running build's version and uptime, so a stuck or mis-deployed instance is
// distinguishable from a healthy one.
describe("GET /health", () => {
  it("reports ok status with a version and a numeric uptime", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.version).toBe("string");
    expect(res.body.version.length).toBeGreaterThan(0);
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("derives uptime from the recorded start time", async () => {
    setStartedAt(new Date(Date.now() - 5000));

    const res = await request(app).get("/health");

    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(5);
  });
});
