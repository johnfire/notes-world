import { EventEmitter } from 'events';
import { Item, Tag } from '../types';

// Domain event payloads
export interface ItemCapturedEvent   { item: Item; created_at: string }
export interface ItemUpdatedEvent    { item: Item; updated_at: string }
export interface ItemPromotedEvent   { item: Item; previous_type: string; new_type: string; promoted_at: string }
export interface ItemArchivedEvent   { item: Item; archived_at: string }
export interface ItemRestoredEvent   { item: Item; restored_at: string }
export interface TaskCompletedEvent  { item: Item; completed_at: string }
export interface TaskStartedEvent    { item: Item; started_at: string }
export interface TaskBlockedEvent    { item: Item; reason?: string; blocked_at: string }
export interface ItemTaggedEvent     { item: Item; tag: Tag; tagged_at: string }
export interface ItemUntaggedEvent   { item: Item; tag: Tag; untagged_at: string }
export interface TagDeletedEvent     { tag_id: string; tag_name: string; deleted_at: string }
export interface DependencyAddedEvent    { dependent: Item; dependency: Item; added_at: string }
export interface DependencyRemovedEvent  { dependent: Item; dependency: Item; removed_at: string }
export interface DependencyResolvedEvent { dependent: Item; dependency: Item; resolved_at: string }

export type EventMap = {
  ItemCaptured:       ItemCapturedEvent;
  ItemUpdated:        ItemUpdatedEvent;
  ItemPromoted:       ItemPromotedEvent;
  ItemArchived:       ItemArchivedEvent;
  ItemRestored:       ItemRestoredEvent;
  TaskCompleted:      TaskCompletedEvent;
  TaskStarted:        TaskStartedEvent;
  TaskBlocked:        TaskBlockedEvent;
  ItemTagged:         ItemTaggedEvent;
  ItemUntagged:       ItemUntaggedEvent;
  TagDeleted:         TagDeletedEvent;
  DependencyAdded:    DependencyAddedEvent;
  DependencyRemoved:  DependencyRemovedEvent;
  DependencyResolved: DependencyResolvedEvent;
  ImportCompleted: { import_job_id: string; items_imported: number; items_failed: number; completed_at: string };
};

class TypedEventBus extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return super.emit(event as string, payload);
  }

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.on(event as string, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    return super.off(event as string, listener);
  }
}

// Singleton event bus for the process
export const eventBus = new TypedEventBus();
eventBus.setMaxListeners(50);
