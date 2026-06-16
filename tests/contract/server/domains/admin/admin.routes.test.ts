import request from "supertest";

const ADMIN_ID = "00000000-0000-0000-0000-0000000000aa";

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
    req.userId = ADMIN_ID;
    next();
  },
}));

jest.mock("../../../../../packages/server/src/domains/auth/auth.repository");

import * as authRepo from "../../../../../packages/server/src/domains/auth/auth.repository";
import { createApp } from "../../../../../packages/server/src/app";

const mockRepo = authRepo as jest.Mocked<typeof authRepo>;
const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  // requireAdmin looks up the acting user (must be admin); the controller may
  // also look up the target user. Resolve by id so both paths are satisfied.
  mockRepo.findUserById.mockImplementation((id: string) =>
    Promise.resolve(
      id === ADMIN_ID
        ? ({ id: ADMIN_ID, email: "admin@example.com", role: "admin" } as never)
        : ({ id, email: "u@example.com", role: "free" } as never),
    ),
  );
});

// ── PATCH /api/admin/users/:id/disabled ───────────────────────────────────────

describe("PATCH /api/admin/users/:id/disabled", () => {
  test("disables a user and revokes their sessions", async () => {
    const target = "11111111-1111-1111-1111-111111111111";
    mockRepo.setUserDisabled.mockResolvedValue({
      id: target,
      email: "u@example.com",
      role: "free",
      disabled: true,
    } as never);

    const res = await request(app)
      .patch(`/api/admin/users/${target}/disabled`)
      .send({ disabled: true });

    expect(res.status).toBe(200);
    expect(res.body.disabled).toBe(true);
    expect(mockRepo.setUserDisabled).toHaveBeenCalledWith(target, true);
    expect(mockRepo.deleteAllRefreshTokensForUser).toHaveBeenCalledWith(target);
  });

  test("re-enabling a user does not revoke sessions", async () => {
    const target = "11111111-1111-1111-1111-111111111111";
    mockRepo.setUserDisabled.mockResolvedValue({
      id: target,
      email: "u@example.com",
      role: "free",
      disabled: false,
    } as never);

    await request(app)
      .patch(`/api/admin/users/${target}/disabled`)
      .send({ disabled: false });

    expect(mockRepo.setUserDisabled).toHaveBeenCalledWith(target, false);
    expect(mockRepo.deleteAllRefreshTokensForUser).not.toHaveBeenCalled();
  });

  test("an admin cannot disable their own account", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${ADMIN_ID}/disabled`)
      .send({ disabled: true });

    expect(res.status).toBe(422);
    expect(mockRepo.setUserDisabled).not.toHaveBeenCalled();
  });

  test("rejects a non-boolean disabled value", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/11111111-1111-1111-1111-111111111111/disabled`)
      .send({ disabled: "yes" });

    expect(res.status).toBe(422);
  });
});

// ── PUT /api/admin/users/:id/password ─────────────────────────────────────────

describe("PUT /api/admin/users/:id/password", () => {
  test("resets the password and revokes sessions", async () => {
    const target = "11111111-1111-1111-1111-111111111111";

    const res = await request(app)
      .put(`/api/admin/users/${target}/password`)
      .send({ password: "brand-new-pw" });

    expect(res.status).toBe(204);
    expect(mockRepo.updateUserPasswordHash).toHaveBeenCalledTimes(1);
    expect(mockRepo.updateUserPasswordHash.mock.calls[0][0]).toBe(target);
    expect(mockRepo.deleteAllRefreshTokensForUser).toHaveBeenCalledWith(target);
  });

  test("rejects a password shorter than 8 characters", async () => {
    const res = await request(app)
      .put(`/api/admin/users/11111111-1111-1111-1111-111111111111/password`)
      .send({ password: "short" });

    expect(res.status).toBe(422);
    expect(mockRepo.updateUserPasswordHash).not.toHaveBeenCalled();
  });
});
