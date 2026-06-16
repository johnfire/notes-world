export type UserId = string;
export type ItemId = string;
export type TagId = string;
export type DashboardId = string;
export type BlockId = string;
export type DependencyId = string;
export type CrossRefId = string;
export type CrossReferenceId = string;
export type ImportJobId = string;
export type ImportRecordId = string;

// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = "free" | "gift" | "paid" | "admin";

export interface User {
  id: UserId;
  email: string;
  role: UserRole;
  disabled?: boolean;
  stripe_subscription_status?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  expires_in: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export enum ItemType {
  Untyped = "Untyped",
  Task = "Task",
  Idea = "Idea",
  Note = "Note",
  Reminder = "Reminder",
  Divider = "Divider",
}

export enum ItemStatus {
  Active = "Active",
  Archived = "Archived",
}

export enum TaskStatus {
  Open = "Open",
  InProgress = "InProgress",
  Done = "Done",
  Blocked = "Blocked",
}

export enum Priority {
  Low = "Low",
  Normal = "Normal",
  High = "High",
  Critical = "Critical",
}

export enum IdeaMaturity {
  Seed = "Seed",
  Developing = "Developing",
  Ready = "Ready",
  Parked = "Parked",
}

export interface TaskTypeData {
  task_status: TaskStatus;
  priority: Priority;
  due_date?: string;
  start_date?: string;
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

export type TypeData =
  | TaskTypeData
  | IdeaTypeData
  | NoteTypeData
  | ReminderTypeData
  | null;

export interface Item {
  id: ItemId;
  user_id: UserId;
  title: string;
  body?: string;
  item_type: ItemType;
  status: ItemStatus;
  type_data?: TypeData;
  color?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface Tag {
  id: TagId;
  user_id: UserId;
  name: string;
  tag_source: "folder" | "file" | "semantic" | "manual";
  color: string | null;
  count?: number;
  created_at: string;
  updated_at: string;
}

export interface TagWithCount extends Tag {
  item_count: number;
}

// ─── Views / Dashboard ───────────────────────────────────────────────────────

export enum ViewType {
  ActionableTasks = "ActionableTasks",
  RecentItems = "RecentItems",
  TagCloud = "TagCloud",
  ItemsByTag = "ItemsByTag",
  BlockedTasks = "BlockedTasks",
  OverdueTasks = "OverdueTasks",
  DependencyGraph = "DependencyGraph",
  QuickCapture = "QuickCapture",
  Notes = "Notes",
  Ideas = "Ideas",
}

export interface BlockConfig {
  tag_id?: TagId;
  filter_tag_id?: TagId;
  group_by_maturity?: boolean;
  limit?: number;
  root_item_id?: ItemId;
  depth?: number;
  sort_mode?: "manual" | "due_date" | "start_date";
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

export interface DashboardResponse {
  dashboard: Dashboard;
  blocks: Block[];
}

// ─── Relationships ───────────────────────────────────────────────────────────

export enum DependencyStatus {
  Active = "Active",
  Resolved = "Resolved",
  Removed = "Removed",
}

export interface Dependency {
  id: DependencyId;
  dependent_id: ItemId;
  dependency_id: ItemId;
  user_id: UserId;
  status: DependencyStatus;
  created_at: string;
  resolved_at: string | null;
  removed_at: string | null;
}

export interface CrossReference {
  id: CrossReferenceId;
  item_a_id: ItemId;
  item_b_id: ItemId;
  user_id: UserId;
  created_at: string;
}

// ─── Sort Orders ─────────────────────────────────────────────────────────────

export interface SortOrderEntry {
  item_id: ItemId;
  sort_order: number;
}

export interface SortOrderContext {
  context_key: string;
  items: SortOrderEntry[];
}

// ─── Import ──────────────────────────────────────────────────────────────────

export enum ImportJobStatus {
  Pending = "Pending",
  InProgress = "InProgress",
  Completed = "Completed",
  Failed = "Failed",
}

export enum ImportRecordStatus {
  Success = "Success",
  Skipped = "Skipped",
  Failed = "Failed",
}

export interface ImportJob {
  id: ImportJobId;
  user_id: string;
  source_filename: string;
  source_size: number;
  status: ImportJobStatus;
  items_found: number;
  items_imported: number;
  items_skipped: number;
  items_failed: number;
  auto_tag: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ImportRecord {
  id: ImportRecordId;
  import_job_id: ImportJobId;
  sequence: number;
  raw_title: string | null;
  raw_body: string | null;
  status: ImportRecordStatus;
  created_item_id: string | null;
  error_message: string | null;
  created_at: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

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

// ─── API Errors ──────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export type ChecklistId = string;

export interface ChecklistItem {
  id: string;
  checklist_id: ChecklistId;
  name: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: ChecklistId;
  user_id: UserId;
  title: string;
  sort_order: number;
  items?: ChecklistItem[]; // present on detail fetch (GET /:id)
  item_count?: number; // present on list fetch (GET /)
  checked_count?: number; // present on list fetch (GET /)
  created_at: string;
  updated_at: string;
}
