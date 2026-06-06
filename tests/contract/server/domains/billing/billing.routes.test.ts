import request from "supertest";

jest.mock("../../../../../packages/server/src/domains/billing/billing.service");
jest.mock("../../../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../../../../packages/server/src/middleware/auth", () => ({
  requireAuth: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    req.userId = "00000000-0000-0000-0000-000000000001";
    next();
  },
}));

import * as service from "../../../../../packages/server/src/domains/billing/billing.service";
import { createApp } from "../../../../../packages/server/src/app";

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
// Regression: the global express.json() parser must NOT consume the webhook's
// request body, otherwise Stripe signature verification (which needs the raw
// bytes) always fails and subscription/role updates silently never apply.

describe("POST /api/billing/webhook", () => {
  test("passes the RAW request body (a Buffer) to the service, not a parsed object", async () => {
    mockService.handleWebhook.mockResolvedValue(undefined);
    const rawBody = '{"type":"customer.subscription.updated","data":{}}';

    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=1,v1=deadbeef")
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockService.handleWebhook).toHaveBeenCalledTimes(1);

    const [payloadArg, sigArg] = mockService.handleWebhook.mock.calls[0];
    expect(Buffer.isBuffer(payloadArg)).toBe(true);
    expect((payloadArg as Buffer).toString("utf8")).toBe(rawBody);
    expect(sigArg).toBe("t=1,v1=deadbeef");
  });

  test("returns 400 when the service rejects (e.g. bad signature)", async () => {
    mockService.handleWebhook.mockRejectedValue(
      new Error("Webhook signature verification failed"),
    );

    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "bad")
      .send('{"type":"x"}');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature verification failed/i);
  });
});
