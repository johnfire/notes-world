import { UserId } from '../../types';
import { NotFoundError, AuthorizationError } from '../../utils/errors';
import * as repo from './dividers.repository';
import { DividerRow } from './dividers.repository';

export async function createDivider(userId: UserId, label?: string | null): Promise<DividerRow> {
  return repo.insertDivider(userId, label ?? null);
}

export async function listDividers(userId: UserId): Promise<DividerRow[]> {
  return repo.findDividersByUser(userId);
}

export async function updateDivider(userId: UserId, dividerId: string, label: string | null): Promise<DividerRow> {
  const divider = await repo.findDividerById(dividerId, userId);
  if (!divider) throw new NotFoundError('Divider', dividerId);
  if (divider.user_id !== userId) throw new AuthorizationError('Not your divider');
  return repo.updateDivider(dividerId, userId, label);
}

export async function deleteDivider(userId: UserId, dividerId: string): Promise<void> {
  const divider = await repo.findDividerById(dividerId, userId);
  if (!divider) throw new NotFoundError('Divider', dividerId);
  if (divider.user_id !== userId) throw new AuthorizationError('Not your divider');
  await repo.deleteDivider(dividerId, userId);
}
