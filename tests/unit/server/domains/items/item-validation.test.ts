import {
  validateColor,
  validateTypeData,
  validateItemType,
  validateItemStatus,
} from "../../../../../packages/server/src/domains/items/item-validation";
import { ItemType, ItemStatus } from "../../../../../packages/server/src/types";
import { LIMITS } from "../../../../../packages/server/src/constants";

describe("validateColor", () => {
  test("accepts a valid hex color, undefined, and null", () => {
    expect(() => validateColor("#fff")).not.toThrow();
    expect(() => validateColor("#1a2b3c")).not.toThrow();
    expect(() => validateColor(undefined)).not.toThrow();
    expect(() => validateColor(null)).not.toThrow();
  });

  test("rejects non-hex strings and non-strings", () => {
    expect(() => validateColor("red")).toThrow();
    expect(() => validateColor("#gggggg")).toThrow();
    expect(() => validateColor(123)).toThrow();
  });
});

describe("validateTypeData", () => {
  test("accepts a plain object, undefined, and null", () => {
    expect(() => validateTypeData({ task_status: "Open" })).not.toThrow();
    expect(() => validateTypeData(undefined)).not.toThrow();
    expect(() => validateTypeData(null)).not.toThrow();
  });

  test("rejects arrays and primitives (downstream code spreads it)", () => {
    expect(() => validateTypeData([1, 2, 3])).toThrow();
    expect(() => validateTypeData("a string")).toThrow();
    expect(() => validateTypeData(42)).toThrow();
  });

  test("rejects a blob over the serialized size cap", () => {
    const huge = { note: "x".repeat(LIMITS.ITEM_TYPE_DATA_MAX + 1) };
    expect(() => validateTypeData(huge)).toThrow();
  });
});

describe("validateItemType", () => {
  test("accepts a known type and undefined", () => {
    expect(() => validateItemType(ItemType.Task)).not.toThrow();
    expect(() => validateItemType(undefined)).not.toThrow();
  });

  test("rejects an unknown type", () => {
    expect(() => validateItemType("Sandwich")).toThrow();
  });
});

describe("validateItemStatus", () => {
  test("accepts a known status and undefined", () => {
    expect(() => validateItemStatus(ItemStatus.Active)).not.toThrow();
    expect(() => validateItemStatus(undefined)).not.toThrow();
  });

  test("rejects an unknown status", () => {
    expect(() => validateItemStatus("Frozen")).toThrow();
  });
});
