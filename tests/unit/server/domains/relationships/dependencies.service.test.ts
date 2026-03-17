import { ItemType, ItemStatus, DependencyStatus, TaskStatus, Priority } from '../../../../../src/server/src/types';
import { makeItem, TEST_USER_ID, OTHER_USER_ID } from '../../../../helpers/itemFactory';

// ── Mock dependencies before importing the service ────────────────────────────
jest.mock('../../../../../src/server/src/domains/relationships/dependencies.repository');
jest.mock('../../../../../src/server/src/domains/items/items.repository');
jest.mock('../../../../../src/server/src/events/eventBus', () => ({
  eventBus: { emit: jest.fn() },
}));

import * as repo from '../../../../../src/server/src/domains/relationships/dependencies.repository';
import * as itemRepo from '../../../../../src/server/src/domains/items/items.repository';
import * as service from '../../../../../src/server/src/domains/relationships/dependencies.service';
import { eventBus } from '../../../../../src/server/src/events/eventBus';

const mockRepo     = repo     as jest.Mocked<typeof repo>;
const mockItemRepo = itemRepo as jest.Mocked<typeof itemRepo>;
const mockBus      = eventBus.emit as jest.Mock;

const ITEM_A_ID = '00000000-0000-0000-0001-000000000001';
const ITEM_B_ID = '00000000-0000-0000-0001-000000000002';

function makeDependency(overrides: Partial<{
  id: string; dependent_id: string; dependency_id: string;
  user_id: string; status: DependencyStatus;
  created_at: string; resolved_at: string | null; removed_at: string | null;
}> = {}) {
  return {
    id:            'dep-id-1',
    dependent_id:  ITEM_A_ID,
    dependency_id: ITEM_B_ID,
    user_id:       TEST_USER_ID,
    status:        DependencyStatus.Active,
    created_at:    new Date().toISOString(),
    resolved_at:   null,
    removed_at:    null,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ── addDependency ─────────────────────────────────────────────────────────────

describe('addDependency', () => {
  test('success: inserts and emits DependencyAdded', async () => {
    const dependent  = makeItem({ id: ITEM_A_ID });
    const dependency = makeItem({ id: ITEM_B_ID });
    const dep        = makeDependency();

    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(dependency);
    mockRepo.findActiveDependency.mockResolvedValue(null);
    mockRepo.countActiveDependencies.mockResolvedValue(0);
    mockRepo.findReachableItems.mockResolvedValue([]);
    mockRepo.insertDependency.mockResolvedValue(dep);

    const result = await service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);

    expect(mockRepo.insertDependency).toHaveBeenCalledWith(ITEM_A_ID, ITEM_B_ID, TEST_USER_ID);
    expect(mockBus).toHaveBeenCalledWith('DependencyAdded', expect.objectContaining({ dependent, dependency }));
    expect(result).toBe(dep);
  });

  test('throws ValidationError when dependent === dependency', async () => {
    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_A_ID))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockItemRepo.findById).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when dependent not found', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws NotFoundError when dependency not found', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(null);

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws AuthorizationError when dependent belongs to other user', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID, user_id: OTHER_USER_ID }))
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws AuthorizationError when dependency belongs to other user', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID, user_id: OTHER_USER_ID }));

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  test('throws ConflictError when dependency already exists', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));
    mockRepo.findActiveDependency.mockResolvedValue(makeDependency());

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });

  test('throws LimitExceeded when at max dependencies', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));
    mockRepo.findActiveDependency.mockResolvedValue(null);
    mockRepo.countActiveDependencies.mockResolvedValue(50);

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });

  test('throws CircularDependencyError when cycle detected', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));
    mockRepo.findActiveDependency.mockResolvedValue(null);
    mockRepo.countActiveDependencies.mockResolvedValue(0);
    // ITEM_B already reaches ITEM_A
    mockRepo.findReachableItems.mockResolvedValue([ITEM_A_ID]);

    await expect(service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'CIRCULAR_DEPENDENCY' });
  });

  test('blocks Task when dependency is not Done', async () => {
    const dependent  = makeItem({ id: ITEM_A_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Open, priority: Priority.Normal }});
    const dependency = makeItem({ id: ITEM_B_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Open, priority: Priority.Normal }});
    const dep        = makeDependency();

    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(dependency);
    mockRepo.findActiveDependency.mockResolvedValue(null);
    mockRepo.countActiveDependencies.mockResolvedValue(0);
    mockRepo.findReachableItems.mockResolvedValue([]);
    mockRepo.insertDependency.mockResolvedValue(dep);
    mockItemRepo.update.mockResolvedValue(dependent);

    await service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);

    expect(mockItemRepo.update).toHaveBeenCalledWith(
      ITEM_A_ID, TEST_USER_ID,
      expect.objectContaining({ type_data: expect.objectContaining({ task_status: 'Blocked' }) })
    );
  });

  test('does not block Task when dependency is Done', async () => {
    const dependent  = makeItem({ id: ITEM_A_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Open, priority: Priority.Normal }});
    const dependency = makeItem({ id: ITEM_B_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Done, priority: Priority.Normal }});
    const dep        = makeDependency();

    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(dependency);
    mockRepo.findActiveDependency.mockResolvedValue(null);
    mockRepo.countActiveDependencies.mockResolvedValue(0);
    mockRepo.findReachableItems.mockResolvedValue([]);
    mockRepo.insertDependency.mockResolvedValue(dep);

    await service.addDependency(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);

    expect(mockItemRepo.update).not.toHaveBeenCalled();
  });
});

// ── removeDependency ──────────────────────────────────────────────────────────

describe('removeDependency', () => {
  test('success: removes and emits DependencyRemoved', async () => {
    const dep        = makeDependency();
    const dependent  = makeItem({ id: ITEM_A_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Open, priority: Priority.Normal }});
    const dependency = makeItem({ id: ITEM_B_ID });

    mockRepo.findDependencyById.mockResolvedValue(dep);
    mockRepo.updateDependencyStatus.mockResolvedValue(dep);
    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(dependency);
    mockRepo.countUnresolvedDependencies.mockResolvedValue(0);
    mockItemRepo.update.mockResolvedValue(dependent);

    await service.removeDependency(TEST_USER_ID, 'dep-id-1');

    expect(mockRepo.updateDependencyStatus).toHaveBeenCalledWith(
      'dep-id-1', TEST_USER_ID, DependencyStatus.Removed, expect.any(String)
    );
    expect(mockBus).toHaveBeenCalledWith('DependencyRemoved', expect.objectContaining({ dependent, dependency }));
  });

  test('throws NotFoundError when dep not found', async () => {
    mockRepo.findDependencyById.mockResolvedValue(null);

    await expect(service.removeDependency(TEST_USER_ID, 'missing'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws ConflictError when dep is not Active', async () => {
    mockRepo.findDependencyById.mockResolvedValue(makeDependency({ status: DependencyStatus.Resolved }));

    await expect(service.removeDependency(TEST_USER_ID, 'dep-id-1'))
      .rejects.toMatchObject({ code: 'CONFLICT_ERROR' });
  });

  test('unblocks Blocked Task when last dep removed', async () => {
    const dep       = makeDependency();
    const dependent = makeItem({ id: ITEM_A_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Blocked, priority: Priority.Normal }});

    mockRepo.findDependencyById.mockResolvedValue(dep);
    mockRepo.updateDependencyStatus.mockResolvedValue(dep);
    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));
    mockRepo.countUnresolvedDependencies.mockResolvedValue(0);
    mockItemRepo.update.mockResolvedValue(dependent);

    await service.removeDependency(TEST_USER_ID, 'dep-id-1');

    expect(mockItemRepo.update).toHaveBeenCalledWith(
      ITEM_A_ID, TEST_USER_ID,
      expect.objectContaining({ type_data: expect.objectContaining({ task_status: 'Open' }) })
    );
  });

  test('does not unblock Task when other deps remain', async () => {
    const dep       = makeDependency();
    const dependent = makeItem({ id: ITEM_A_ID, item_type: ItemType.Task, type_data: { task_status: TaskStatus.Blocked, priority: Priority.Normal }});

    mockRepo.findDependencyById.mockResolvedValue(dep);
    mockRepo.updateDependencyStatus.mockResolvedValue(dep);
    mockItemRepo.findById
      .mockResolvedValueOnce(dependent)
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));
    mockRepo.countUnresolvedDependencies.mockResolvedValue(2);

    await service.removeDependency(TEST_USER_ID, 'dep-id-1');

    expect(mockItemRepo.update).not.toHaveBeenCalled();
  });
});

// ── getDependenciesForItem ────────────────────────────────────────────────────

describe('getDependenciesForItem', () => {
  test('delegates to repo', async () => {
    const deps = [makeDependency()];
    mockRepo.findDependenciesForItem.mockResolvedValue(deps);

    const result = await service.getDependenciesForItem(TEST_USER_ID, ITEM_A_ID);

    expect(mockRepo.findDependenciesForItem).toHaveBeenCalledWith(ITEM_A_ID, TEST_USER_ID);
    expect(result).toBe(deps);
  });
});

// ── getDependentsOfItem ───────────────────────────────────────────────────────

describe('getDependentsOfItem', () => {
  test('delegates to repo', async () => {
    const deps = [makeDependency()];
    mockRepo.findDependentsOfItem.mockResolvedValue(deps);

    const result = await service.getDependentsOfItem(TEST_USER_ID, ITEM_B_ID);

    expect(mockRepo.findDependentsOfItem).toHaveBeenCalledWith(ITEM_B_ID, TEST_USER_ID);
    expect(result).toBe(deps);
  });
});

// ── getDependencyChain ────────────────────────────────────────────────────────

describe('getDependencyChain', () => {
  test('delegates to repo', async () => {
    const chain = [ITEM_B_ID, '00000000-0000-0000-0001-000000000003'];
    mockRepo.findReachableItems.mockResolvedValue(chain);

    const result = await service.getDependencyChain(TEST_USER_ID, ITEM_A_ID);

    expect(mockRepo.findReachableItems).toHaveBeenCalledWith(ITEM_A_ID, TEST_USER_ID);
    expect(result).toBe(chain);
  });
});

// ── addCrossReference ─────────────────────────────────────────────────────────

describe('addCrossReference', () => {
  test('success: normalizes order and inserts', async () => {
    const itemA = makeItem({ id: ITEM_A_ID });
    const itemB = makeItem({ id: ITEM_B_ID });

    mockItemRepo.findById
      .mockResolvedValueOnce(itemA)
      .mockResolvedValueOnce(itemB);
    mockRepo.insertCrossReference.mockResolvedValue(undefined);

    await service.addCrossReference(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID);

    // Normalized: smaller ID first
    const [first, second] = ITEM_A_ID < ITEM_B_ID ? [ITEM_A_ID, ITEM_B_ID] : [ITEM_B_ID, ITEM_A_ID];
    expect(mockRepo.insertCrossReference).toHaveBeenCalledWith(first, second, TEST_USER_ID);
  });

  test('throws ValidationError when self-reference', async () => {
    await expect(service.addCrossReference(TEST_USER_ID, ITEM_A_ID, ITEM_A_ID))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockItemRepo.findById).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when item A not found', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeItem({ id: ITEM_B_ID }));

    await expect(service.addCrossReference(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws NotFoundError when item B not found', async () => {
    mockItemRepo.findById
      .mockResolvedValueOnce(makeItem({ id: ITEM_A_ID }))
      .mockResolvedValueOnce(null);

    await expect(service.addCrossReference(TEST_USER_ID, ITEM_A_ID, ITEM_B_ID))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ── removeCrossReference ──────────────────────────────────────────────────────

describe('removeCrossReference', () => {
  test('success: deletes cross reference', async () => {
    const ref = { id: 'ref-1', item_a_id: ITEM_A_ID, item_b_id: ITEM_B_ID, user_id: TEST_USER_ID, created_at: new Date().toISOString() };
    mockRepo.findCrossReferenceById.mockResolvedValue(ref);
    mockRepo.deleteCrossReference.mockResolvedValue(undefined);

    await service.removeCrossReference(TEST_USER_ID, 'ref-1');

    expect(mockRepo.deleteCrossReference).toHaveBeenCalledWith('ref-1', TEST_USER_ID);
  });

  test('throws NotFoundError when not found', async () => {
    mockRepo.findCrossReferenceById.mockResolvedValue(null);

    await expect(service.removeCrossReference(TEST_USER_ID, 'missing'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ── getCrossReferences ────────────────────────────────────────────────────────

describe('getCrossReferences', () => {
  test('delegates to repo', async () => {
    const ids = [ITEM_B_ID];
    mockRepo.findCrossReferencedItems.mockResolvedValue(ids);

    const result = await service.getCrossReferences(TEST_USER_ID, ITEM_A_ID);

    expect(mockRepo.findCrossReferencedItems).toHaveBeenCalledWith(ITEM_A_ID, TEST_USER_ID);
    expect(result).toBe(ids);
  });
});
