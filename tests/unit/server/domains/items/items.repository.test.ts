import { ItemType } from "../../../../../packages/server/src/types";
import { TEST_USER_ID } from "../../../../helpers/itemFactory";

// ── Mock db client before importing repository ────────────────────────────────
jest.mock("../../../../../packages/server/src/db/client", () => ({
  query: jest.fn().mockResolvedValue([]),
  queryOne: jest.fn().mockResolvedValue(null),
  getPool: jest.fn(),
}));

import { query } from "../../../../../packages/server/src/db/client";
import * as repo from "../../../../../packages/server/src/domains/items/items.repository";

const mockQuery = query as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue([]);
});

// ── findDominantTypeForTag ──────────────────────────────────────────────────
// Drives the "new item adopts the tag's prevailing type" feature. The query must
// pick the single most common type among the tag's *other* active members, never
// counting the structural/absent types (Untyped, Divider), with a deterministic
// tie-break so the inherited type is stable.

describe("findDominantTypeForTag", () => {
  test("returns the winning type when the tag has typed members", async () => {
    mockQuery.mockResolvedValue([{ item_type: ItemType.Task }]);

    const result = await repo.findDominantTypeForTag(
      TEST_USER_ID,
      "tag-1",
      "item-1",
    );

    expect(result).toBe(ItemType.Task);
  });

  test("returns null when the tag has no typed members", async () => {
    mockQuery.mockResolvedValue([]);

    const result = await repo.findDominantTypeForTag(
      TEST_USER_ID,
      "tag-1",
      "item-1",
    );

    expect(result).toBeNull();
  });

  test("counts only the tag's other active, real-typed members", async () => {
    await repo.findDominantTypeForTag(TEST_USER_ID, "tag-1", "item-1");

    const sql: string = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/it\.tag_id\s*=\s*\$1/); // scoped to the tag
    expect(sql).toMatch(/i\.status\s*=\s*\$3/); // active only
    expect(sql).toMatch(/i\.id\s*(!=|<>)\s*\$4/); // exclude the item itself
    expect(sql).toMatch(/item_type\s+NOT IN\s*\(\$5,\s*\$6\)/); // drop Untyped/Divider
    expect(sql).toMatch(/COUNT\(\*\)\s+DESC/i); // most common wins
    expect(sql).toMatch(/i\.item_type\s+ASC/i); // deterministic tie-break
  });

  test("passes the exclusion params in order", async () => {
    await repo.findDominantTypeForTag(TEST_USER_ID, "tag-1", "item-1");

    expect(mockQuery.mock.calls[0][1]).toEqual([
      "tag-1",
      TEST_USER_ID,
      "Active",
      "item-1",
      ItemType.Untyped,
      ItemType.Divider,
    ]);
  });
});
