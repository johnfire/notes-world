import bcrypt from "bcrypt";

jest.mock("../../../../../packages/server/src/domains/auth/auth.repository");

import * as repo from "../../../../../packages/server/src/domains/auth/auth.repository";
import * as service from "../../../../../packages/server/src/domains/auth/auth.service";

const mockRepo = repo as jest.Mocked<typeof repo>;

beforeEach(() => jest.restoreAllMocks());
afterEach(() => jest.clearAllMocks());

// ── Account-enumeration timing (audit MEDIUM #3) ──────────────────────────────
// When the email doesn't exist, login must still perform a bcrypt comparison so
// the response time matches the found-user path and accounts can't be probed.

describe("login timing equalization", () => {
  test("runs a bcrypt comparison even when the email is not found", async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    const compareSpy = jest.spyOn(bcrypt, "compare");

    await expect(
      service.login({ email: "ghost@example.com", password: "whatever123" }),
    ).rejects.toThrow("Invalid email or password");

    expect(compareSpy).toHaveBeenCalledTimes(1);
  });
});

// ── Session invalidation on password change (audit MEDIUM #4) ──────────────────
// Changing the password must revoke all refresh tokens so a stolen session
// cannot survive the change.

describe("changePassword session invalidation", () => {
  test("revokes all refresh tokens after a successful change", async () => {
    const userId = "user-1";
    const currentHash = bcrypt.hashSync("current-pw", 4);
    mockRepo.findUserByIdFull.mockResolvedValue({
      id: userId,
      email: "u@example.com",
      role: "free",
      password_hash: currentHash,
    } as never);
    mockRepo.updateUserPasswordHash.mockResolvedValue(undefined as never);
    mockRepo.deleteAllRefreshTokensForUser.mockResolvedValue(
      undefined as never,
    );

    await service.changePassword(userId, "current-pw", "new-password-123");

    expect(mockRepo.updateUserPasswordHash).toHaveBeenCalledTimes(1);
    expect(mockRepo.deleteAllRefreshTokensForUser).toHaveBeenCalledWith(userId);
  });

  test("does NOT revoke tokens when the current password is wrong", async () => {
    const currentHash = bcrypt.hashSync("current-pw", 4);
    mockRepo.findUserByIdFull.mockResolvedValue({
      id: "user-1",
      email: "u@example.com",
      role: "free",
      password_hash: currentHash,
    } as never);

    await expect(
      service.changePassword("user-1", "wrong-pw", "new-password-123"),
    ).rejects.toThrow("Current password is incorrect");

    expect(mockRepo.deleteAllRefreshTokensForUser).not.toHaveBeenCalled();
  });
});
