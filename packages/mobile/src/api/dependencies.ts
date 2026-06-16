import { api } from "./client";
import type { Dependency } from "@notes-world/shared";

// Items this item depends on (it is "blocked by" them).
export function getDependencies(itemId: string): Promise<Dependency[]> {
  return api.get<Dependency[]>(`/items/${itemId}/dependencies`);
}

// Items that depend on this item (this item is "blocking" them).
export function getDependents(itemId: string): Promise<Dependency[]> {
  return api.get<Dependency[]>(`/items/${itemId}/dependents`);
}

export function addDependency(
  dependentId: string,
  dependencyId: string,
): Promise<Dependency> {
  return api.post<Dependency>(`/items/${dependentId}/dependencies`, {
    dependency_id: dependencyId,
  });
}

export function removeDependency(depId: string): Promise<void> {
  return api.delete<void>(`/dependencies/${depId}`);
}
