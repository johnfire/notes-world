export type UserId = string;
export type ItemId = string;
export type TagId = string;
export type DashboardId = string;
export type BlockId = string;
export type DependencyId = string;
export type CrossRefId = string;
export type CrossReferenceId = string;

export enum DependencyStatus {
  Active   = 'Active',
  Resolved = 'Resolved',
  Removed  = 'Removed',
}

export interface Dependency {
  id:            DependencyId;
  dependent_id:  ItemId;
  dependency_id: ItemId;
  user_id:       UserId;
  status:        DependencyStatus;
  created_at:    string;
  resolved_at:   string | null;
  removed_at:    string | null;
}

export interface CrossReference {
  id:         CrossReferenceId;
  item_a_id:  ItemId;
  item_b_id:  ItemId;
  user_id:    UserId;
  created_at: string;
}

export enum ItemType {
  Untyped = 'Untyped',
  Task = 'Task',
  Idea = 'Idea',
  Note = 'Note',
  Reminder = 'Reminder',
}

export enum ItemStatus {
  Active = 'Active',
  Archived = 'Archived',
}

export enum TaskStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Done = 'Done',
  Blocked = 'Blocked',
}

export enum Priority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
  Critical = 'Critical',
}

export enum IdeaMaturity {
  Seed = 'Seed',
  Developing = 'Developing',
  Ready = 'Ready',
  Parked = 'Parked',
}

export interface TaskTypeData {
  task_status: TaskStatus;
  priority: Priority;
  due_date?: string;
  completed_at?: string;
}

export interface IdeaTypeData {
  maturity: IdeaMaturity;
}

export interface NoteTypeData {
  category?: string;
}

export interface ReminderTypeData {
  remind_at: string;
  is_dismissed: boolean;
}

export type TypeData = TaskTypeData | IdeaTypeData | NoteTypeData | ReminderTypeData | null;

export interface Item {
  id: ItemId;
  user_id: UserId;
  title: string;
  body?: string;
  item_type: ItemType;
  status: ItemStatus;
  type_data?: TypeData;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: TagId;
  user_id: UserId;
  name: string;
  created_at: string;
  updated_at: string;
}

export enum ViewType {
  ActionableTasks = 'ActionableTasks',
  RecentItems = 'RecentItems',
  TagCloud = 'TagCloud',
  ItemsByTag = 'ItemsByTag',
  BlockedTasks = 'BlockedTasks',
  OverdueTasks = 'OverdueTasks',
  DependencyGraph = 'DependencyGraph',
  QuickCapture = 'QuickCapture',
  Notes = 'Notes',
  Ideas = 'Ideas',
}

export interface BlockConfig {
  tag_id?: TagId;
  filter_tag_id?: TagId;
  group_by_maturity?: boolean;
  limit?: number;
  root_item_id?: ItemId;
  depth?: number;
}

export interface Dashboard {
  id: DashboardId;
  user_id: UserId;
  columns: number;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: BlockId;
  dashboard_id: DashboardId;
  user_id: UserId;
  view_type: ViewType;
  title?: string;
  row: number;
  column: number;
  config?: BlockConfig;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type ImportJobId    = string;
export type ImportRecordId = string;

export enum ImportJobStatus {
  Pending    = 'Pending',
  InProgress = 'InProgress',
  Completed  = 'Completed',
  Failed     = 'Failed',
}

export enum ImportRecordStatus {
  Success = 'Success',
  Skipped = 'Skipped',
  Failed  = 'Failed',
}

export interface ImportJob {
  id:              ImportJobId;
  user_id:         string;
  source_filename: string;
  source_size:     number;
  status:          ImportJobStatus;
  items_found:     number;
  items_imported:  number;
  items_skipped:   number;
  items_failed:    number;
  auto_tag:        string | null;
  started_at:      string | null;
  completed_at:    string | null;
  error_message:   string | null;
  created_at:      string;
}

export interface ImportRecord {
  id:              ImportRecordId;
  import_job_id:   ImportJobId;
  sequence:        number;
  raw_title:       string | null;
  raw_body:        string | null;
  status:          ImportRecordStatus;
  created_item_id: string | null;
  error_message:   string | null;
  created_at:      string;
}
