import { Item, ItemType, ItemStatus, Tag } from '../../src/server/src/types';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
export const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002';

let _seq = 1;
function id() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }
function now() { return new Date().toISOString(); }

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id:         id(),
    user_id:    TEST_USER_ID,
    title:      'Test item',
    item_type:  ItemType.Untyped,
    status:     ItemStatus.Active,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id:         id(),
    user_id:    TEST_USER_ID,
    name:       'test-tag',
    tag_source: 'manual',
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}
