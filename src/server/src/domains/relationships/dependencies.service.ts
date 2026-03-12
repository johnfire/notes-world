import { UserId, ItemId, DependencyStatus } from '../../types';
import { eventBus } from '../../events/eventBus';
import { LIMITS } from '../../constants';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  LimitExceeded,
  CircularDependencyError,
} from '../../utils/errors';
import * as repo from './dependencies.repository';
import * as itemRepo from '../items/items.repository';

export async function addDependency(userId: UserId, dependentId: ItemId, dependencyId: ItemId) {
  if (dependentId === dependencyId) {
    throw new ValidationError('An item cannot depend on itself');
  }

  const [dependent, dependency] = await Promise.all([
    itemRepo.findById(dependentId, userId),
    itemRepo.findById(dependencyId, userId),
  ]);
  if (!dependent)  throw new NotFoundError('Item', dependentId);
  if (!dependency) throw new NotFoundError('Item', dependencyId);
  if (dependent.user_id  !== userId) throw new AuthorizationError('Not owner');
  if (dependency.user_id !== userId) throw new AuthorizationError('Not owner');

  // Check for existing active dependency
  const existing = await repo.findActiveDependency(dependentId, dependencyId);
  if (existing) throw new ConflictError('Dependency already exists between these items');

  // Check limit
  const count = await repo.countActiveDependencies(dependentId);
  if (count >= LIMITS.DEPS_PER_ITEM_MAX) {
    throw new LimitExceeded('Item has too many dependencies', { current_count: count, maximum: LIMITS.DEPS_PER_ITEM_MAX });
  }

  // Circular dependency check: does dependencyId already (directly or transitively) depend on dependentId?
  const reachable = await repo.findReachableItems(dependencyId, userId);
  if (reachable.includes(dependentId)) {
    // Build cycle path: dependentId -> dependencyId -> ... -> dependentId
    const cyclePath = [dependentId, dependencyId, ...reachable.slice(0, reachable.indexOf(dependentId) + 1)];
    throw new CircularDependencyError(cyclePath);
  }

  const dep = await repo.insertDependency(dependentId, dependencyId, userId);
  eventBus.emit('DependencyAdded', { dependent, dependency, added_at: new Date().toISOString() });

  // If dependent is a Task and the dependency is not Done, block the task
  const td = dependency.type_data as { task_status?: string } | null;
  const depIsDone = td?.task_status === 'Done';
  if (dependent.item_type === 'Task' && !depIsDone) {
    const currentTd = dependent.type_data as Record<string, unknown> | null ?? {};
    if (currentTd.task_status !== 'Blocked') {
      await itemRepo.update(dependentId, userId, {
        type_data: { ...currentTd, task_status: 'Blocked' },
      });
    }
  }

  return dep;
}

export async function removeDependency(userId: UserId, depId: string) {
  const dep = await repo.findDependencyById(depId, userId);
  if (!dep) throw new NotFoundError('Dependency', depId);
  if (dep.user_id !== userId) throw new AuthorizationError('Not owner');
  if (dep.status !== DependencyStatus.Active) throw new ConflictError('Dependency is not active');

  const now = new Date().toISOString();
  await repo.updateDependencyStatus(depId, userId, DependencyStatus.Removed, now);

  const [dependent, dependency] = await Promise.all([
    itemRepo.findById(dep.dependent_id, userId),
    itemRepo.findById(dep.dependency_id, userId),
  ]);

  if (dependent && dependency) {
    eventBus.emit('DependencyRemoved', { dependent, dependency, removed_at: now });

    // If dependent is a Blocked Task and no more unresolved deps remain, unblock it
    if (dependent.item_type === 'Task') {
      const unresolvedCount = await repo.countUnresolvedDependencies(dep.dependent_id);
      const td = dependent.type_data as Record<string, unknown> | null ?? {};
      if (td.task_status === 'Blocked' && unresolvedCount === 0) {
        await itemRepo.update(dep.dependent_id, userId, {
          type_data: { ...td, task_status: 'Open' },
        });
      }
    }
  }
}

export async function getDependenciesForItem(userId: UserId, itemId: ItemId) {
  return repo.findDependenciesForItem(itemId, userId);
}

export async function getDependentsOfItem(userId: UserId, itemId: ItemId) {
  return repo.findDependentsOfItem(itemId, userId);
}

export async function getDependencyChain(userId: UserId, itemId: ItemId) {
  return repo.findDependencyChain(itemId, userId);
}

export async function addCrossReference(userId: UserId, itemAId: ItemId, itemBId: ItemId) {
  if (itemAId === itemBId) {
    throw new ValidationError('Cannot cross-reference an item with itself');
  }
  const [itemA, itemB] = await Promise.all([
    itemRepo.findById(itemAId, userId),
    itemRepo.findById(itemBId, userId),
  ]);
  if (!itemA) throw new NotFoundError('Item', itemAId);
  if (!itemB) throw new NotFoundError('Item', itemBId);
  if (itemA.user_id !== userId) throw new AuthorizationError('Not owner');
  if (itemB.user_id !== userId) throw new AuthorizationError('Not owner');

  // Normalize order so (A,B) and (B,A) resolve to the same row
  const [first, second] = itemAId < itemBId ? [itemAId, itemBId] : [itemBId, itemAId];
  await repo.insertCrossReference(first, second, userId);
}

export async function removeCrossReference(userId: UserId, crossRefId: string) {
  const ref = await repo.findCrossReferenceById(crossRefId, userId);
  if (!ref) throw new NotFoundError('CrossReference', crossRefId);
  if (ref.user_id !== userId) throw new AuthorizationError('Not owner');
  await repo.deleteCrossReference(crossRefId, userId);
}

export async function getCrossReferences(userId: UserId, itemId: ItemId) {
  return repo.findCrossReferencedItems(itemId, userId);
}

// Called by event subscription when a task is completed
export async function resolveDependencies(completedItemId: ItemId, userId: UserId) {
  const dependents = await repo.findDependentsOfItem(completedItemId, userId);
  const now = new Date().toISOString();

  for (const dep of dependents) {
    await repo.updateDependencyStatus(dep.id, userId, DependencyStatus.Resolved, now);

    const [dependent, dependency] = await Promise.all([
      itemRepo.findById(dep.dependent_id, userId),
      itemRepo.findById(completedItemId, userId),
    ]);

    if (!dependent || !dependency) continue;

    // Check if all unresolved deps are now gone
    const unresolvedCount = await repo.countUnresolvedDependencies(dep.dependent_id);
    const td = dependent.type_data as Record<string, unknown> | null ?? {};
    if (dependent.item_type === 'Task' && td.task_status === 'Blocked' && unresolvedCount === 0) {
      await itemRepo.update(dep.dependent_id, userId, {
        type_data: { ...td, task_status: 'Open' },
      });
    }

    eventBus.emit('DependencyResolved', { dependent, dependency, resolved_at: now });
  }
}
