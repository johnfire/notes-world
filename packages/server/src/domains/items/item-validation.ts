// Shared item-field validators. Used by both the items service (update/promote)
// and the import service so the same rules apply on every write path.
import { ItemType, ItemStatus } from "../../types";
import { LIMITS } from "../../constants";
import { ValidationError } from "../../utils/errors";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

export function validateColor(color: unknown): void {
  if (color === undefined || color === null) return;
  if (typeof color !== "string" || !HEX_COLOR_RE.test(color)) {
    throw new ValidationError("color must be a hex color string");
  }
}

// type_data is a free-form JSON blob the client controls. Reject non-objects
// (downstream code spreads it as an object) and cap the serialized size so a
// caller can't bloat the DB / exhaust memory with multi-MB or deeply nested
// blobs.
export function validateTypeData(typeData: unknown): void {
  if (typeData === undefined || typeData === null) return;
  if (typeof typeData !== "object" || Array.isArray(typeData)) {
    throw new ValidationError("type_data must be an object");
  }
  const size = JSON.stringify(typeData).length;
  if (size > LIMITS.ITEM_TYPE_DATA_MAX) {
    throw new ValidationError("type_data is too large", {
      length: size,
      maximum: LIMITS.ITEM_TYPE_DATA_MAX,
    });
  }
}

export function validateItemType(itemType: unknown): void {
  if (itemType === undefined) return;
  if (!Object.values(ItemType).includes(itemType as ItemType)) {
    throw new ValidationError(`Invalid item_type: ${String(itemType)}`);
  }
}

export function validateItemStatus(status: unknown): void {
  if (status === undefined) return;
  if (!Object.values(ItemStatus).includes(status as ItemStatus)) {
    throw new ValidationError(`Invalid status: ${String(status)}`);
  }
}
