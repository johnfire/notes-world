import { TEST_USER_ID } from "../../../../helpers/itemFactory";

// ── Mock db client before importing repository ────────────────────────────────
jest.mock("../../../../../packages/server/src/db/client", () => ({
  query: jest.fn().mockResolvedValue([]),
  queryOne: jest.fn().mockResolvedValue(null),
  getPool: jest.fn(),
}));

import { query } from "../../../../../packages/server/src/db/client";
import * as repo from "../../../../../packages/server/src/domains/relationships/relationships.repository";

const mockQuery = query as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue([]);
});

// Regression: tag counts must only include active, non-divider items.
// Dividers are tagged items too and were inflating sidebar counts;
// findAllTags also counted trashed items.

describe("findTagUsageCounts", () => {
  test("counts only active non-divider items", async () => {
    await repo.findTagUsageCounts(TEST_USER_ID);

    const sql: string = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/status\s*=\s*'Active'/);
    expect(sql).toMatch(/item_type\s*(!=|<>)\s*'Divider'/);
  });
});

describe("findAllTags", () => {
  test("counts only active non-divider items", async () => {
    await repo.findAllTags(TEST_USER_ID);

    const sql: string = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/status\s*=\s*'Active'/);
    expect(sql).toMatch(/item_type\s*(!=|<>)\s*'Divider'/);
  });
});
