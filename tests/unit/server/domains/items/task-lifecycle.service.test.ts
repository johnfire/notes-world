import { ItemType, ItemStatus, TaskStatus, Priority } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock the repository before importing the service ──────────────────────────
jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo from '../../../../../src/server/src/domains/items/items.repository';
import * as service from '../../../../../src/server/src/domains/items/items.service';
import { eventBus } from '../../../../../src/server/src/events/eventBus';

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockBus  = eventBus.emit as jest.Mock;

beforeEach(() => jest.clearAllMocks());

function makeTask(task_status: string, overrides = {}) {
  return makeItem({
    item_type: ItemType.Task,
    type_data: { task_status: task_status as TaskStatus, priority: Priority.Normal },
    ...overrides,
  });
}

// ── completeTask ───────────────────────────────────────────────────────────────

describe('completeTask', () => {
  test('success: updates task_status to Done, sets completed_at, emits TaskCompleted', async () => {
    const item    = makeTask(TaskStatus.Open);
    const updated = makeTask(TaskStatus.Done, { id: item.id });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.completeTask(TEST_USER_ID, item.id);

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id,
      TEST_USER_ID,
      expect.objectContaining({
        type_data: expect.objectContaining({ task_status: TaskStatus.Done, completed_at: expect.any(String) }),
      })
    );
    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('TaskCompleted', expect.objectContaining({ item: updated }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.completeTask(TEST_USER_ID, 'missing-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    const item = makeTask(TaskStatus.Open, { user_id: OTHER_USER_ID });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.completeTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ValidationError when item is not a Task', async () => {
    const item = makeItem({ item_type: ItemType.Note });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.completeTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws StateError when item is Archived', async () => {
    const item = makeTask(TaskStatus.Open, { status: ItemStatus.Archived });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.completeTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws StateError when task is Blocked', async () => {
    const item = makeTask(TaskStatus.Blocked);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.completeTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws ConflictError when task is already Done', async () => {
    const item = makeTask(TaskStatus.Done);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.completeTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });
});

// ── startTask ─────────────────────────────────────────────────────────────────

describe('startTask', () => {
  test('success: updates task_status to InProgress, emits TaskStarted', async () => {
    const item    = makeTask(TaskStatus.Open);
    const updated = makeTask(TaskStatus.InProgress, { id: item.id });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.startTask(TEST_USER_ID, item.id);

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id,
      TEST_USER_ID,
      expect.objectContaining({
        type_data: expect.objectContaining({ task_status: TaskStatus.InProgress }),
      })
    );
    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('TaskStarted', expect.objectContaining({ item: updated }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.startTask(TEST_USER_ID, 'missing-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    const item = makeTask(TaskStatus.Open, { user_id: OTHER_USER_ID });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ValidationError when not a Task', async () => {
    const item = makeItem({ item_type: ItemType.Idea });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws StateError when Archived', async () => {
    const item = makeTask(TaskStatus.Open, { status: ItemStatus.Archived });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws StateError when Blocked', async () => {
    const item = makeTask(TaskStatus.Blocked);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws StateError when Done', async () => {
    const item = makeTask(TaskStatus.Done);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws ConflictError when already InProgress', async () => {
    const item = makeTask(TaskStatus.InProgress);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.startTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });
});

// ── blockTask ─────────────────────────────────────────────────────────────────

describe('blockTask', () => {
  test('success: updates task_status to Blocked, emits TaskBlocked', async () => {
    const item    = makeTask(TaskStatus.Open);
    const updated = makeTask(TaskStatus.Blocked, { id: item.id });
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.blockTask(TEST_USER_ID, item.id);

    expect(mockRepo.update).toHaveBeenCalledWith(
      item.id,
      TEST_USER_ID,
      expect.objectContaining({
        type_data: expect.objectContaining({ task_status: TaskStatus.Blocked }),
      })
    );
    expect(result).toBe(updated);
    expect(mockBus).toHaveBeenCalledWith('TaskBlocked', expect.objectContaining({ item: updated }));
  });

  test('throws NotFoundError when item missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.blockTask(TEST_USER_ID, 'missing-id'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when not owner', async () => {
    const item = makeTask(TaskStatus.Open, { user_id: OTHER_USER_ID });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.blockTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ValidationError when not a Task', async () => {
    const item = makeItem({ item_type: ItemType.Reminder });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.blockTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('throws StateError when Archived', async () => {
    const item = makeTask(TaskStatus.Open, { status: ItemStatus.Archived });
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.blockTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws StateError when Done', async () => {
    const item = makeTask(TaskStatus.Done);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.blockTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'STATE_ERROR' });
  });

  test('throws ConflictError when already Blocked', async () => {
    const item = makeTask(TaskStatus.Blocked);
    mockRepo.findById.mockResolvedValue(item);

    await expect(service.blockTask(TEST_USER_ID, item.id))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });
});
