import { TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

jest.mock('../../../../../src/server/src/domains/dividers/dividers.repository');

import * as repo    from '../../../../../src/server/src/domains/dividers/dividers.repository';
import * as service from '../../../../../src/server/src/domains/dividers/dividers.service';

const mockRepo = repo as jest.Mocked<typeof repo>;

let _seq = 1;
function uid() { return `00000000-0000-0000-0000-${String(_seq++).padStart(12, '0')}`; }
function now() { return new Date().toISOString(); }

function makeDivider(overrides: Record<string, unknown> = {}) {
  return { id: uid(), user_id: TEST_USER_ID, label: null, created_at: now(), updated_at: now(), ...overrides };
}

beforeEach(() => jest.clearAllMocks());

// ── createDivider ─────────────────────────────────────────────────────────────

describe('createDivider', () => {
  test('creates divider with label', async () => {
    const divider = makeDivider({ label: 'Work' });
    mockRepo.insertDivider.mockResolvedValue(divider);

    const result = await service.createDivider(TEST_USER_ID, 'Work');

    expect(mockRepo.insertDivider).toHaveBeenCalledWith(TEST_USER_ID, 'Work');
    expect(result).toBe(divider);
  });

  test('creates divider without label', async () => {
    const divider = makeDivider();
    mockRepo.insertDivider.mockResolvedValue(divider);

    const result = await service.createDivider(TEST_USER_ID);

    expect(mockRepo.insertDivider).toHaveBeenCalledWith(TEST_USER_ID, null);
    expect(result).toBe(divider);
  });
});

// ── listDividers ──────────────────────────────────────────────────────────────

describe('listDividers', () => {
  test('returns all dividers for user', async () => {
    const dividers = [makeDivider(), makeDivider({ label: 'Personal' })];
    mockRepo.findDividersByUser.mockResolvedValue(dividers);

    const result = await service.listDividers(TEST_USER_ID);

    expect(result).toBe(dividers);
    expect(mockRepo.findDividersByUser).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

// ── updateDivider ─────────────────────────────────────────────────────────────

describe('updateDivider', () => {
  test('updates label successfully', async () => {
    const divider = makeDivider({ label: 'Old' });
    const updated = makeDivider({ ...divider, label: 'New' });
    mockRepo.findDividerById.mockResolvedValue(divider);
    mockRepo.updateDivider.mockResolvedValue(updated);

    const result = await service.updateDivider(TEST_USER_ID, divider.id, 'New');

    expect(mockRepo.updateDivider).toHaveBeenCalledWith(divider.id, TEST_USER_ID, 'New');
    expect(result).toBe(updated);
  });

  test('clears label when null passed', async () => {
    const divider = makeDivider({ label: 'Work' });
    const updated = makeDivider({ ...divider, label: null });
    mockRepo.findDividerById.mockResolvedValue(divider);
    mockRepo.updateDivider.mockResolvedValue(updated);

    await service.updateDivider(TEST_USER_ID, divider.id, null);

    expect(mockRepo.updateDivider).toHaveBeenCalledWith(divider.id, TEST_USER_ID, null);
  });

  test('throws NotFoundError when divider missing', async () => {
    mockRepo.findDividerById.mockResolvedValue(null);

    await expect(service.updateDivider(TEST_USER_ID, 'missing', 'x'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockRepo.updateDivider).not.toHaveBeenCalled();
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findDividerById.mockResolvedValue(makeDivider({ user_id: OTHER_USER_ID }));

    await expect(service.updateDivider(TEST_USER_ID, 'x', 'label'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
    expect(mockRepo.updateDivider).not.toHaveBeenCalled();
  });
});

// ── deleteDivider ─────────────────────────────────────────────────────────────

describe('deleteDivider', () => {
  test('deletes successfully', async () => {
    const divider = makeDivider();
    mockRepo.findDividerById.mockResolvedValue(divider);
    mockRepo.deleteDivider.mockResolvedValue(undefined);

    await service.deleteDivider(TEST_USER_ID, divider.id);

    expect(mockRepo.deleteDivider).toHaveBeenCalledWith(divider.id, TEST_USER_ID);
  });

  test('throws NotFoundError when divider missing', async () => {
    mockRepo.findDividerById.mockResolvedValue(null);

    await expect(service.deleteDivider(TEST_USER_ID, 'missing'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockRepo.deleteDivider).not.toHaveBeenCalled();
  });

  test('throws AuthorizationError when not owner', async () => {
    mockRepo.findDividerById.mockResolvedValue(makeDivider({ user_id: OTHER_USER_ID }));

    await expect(service.deleteDivider(TEST_USER_ID, 'x'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
    expect(mockRepo.deleteDivider).not.toHaveBeenCalled();
  });
});
