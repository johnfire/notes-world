export type ItemId = string;
export type TagId = string;
export type DashboardId = string;
export type BlockId = string;

export enum ItemType {
  Untyped  = 'Untyped',
  Task     = 'Task',
  Idea     = 'Idea',
  Note     = 'Note',
  Reminder = 'Reminder',
}

export enum ItemStatus {
  Active   = 'Active',
  Archived = 'Archived',
}

export enum TaskStatus {
  Open       = 'Open',
  InProgress = 'InProgress',
  Done       = 'Done',
  Blocked    = 'Blocked',
}

export enum Priority {
  Low      = 'Low',
  Normal   = 'Normal',
  High     = 'High',
  Critical = 'Critical',
}

export enum IdeaMaturity {
  Seed       = 'Seed',
  Developing = 'Developing',
  Ready      = 'Ready',
  Parked     = 'Parked',
}

export interface TaskTypeData {
  task_status:   TaskStatus;
  priority:      Priority;
  due_date?:     string;
  completed_at?: string;
}

export interface IdeaTypeData   { maturity: IdeaMaturity }
export interface NoteTypeData   { category?: string }
export interface ReminderTypeData { remind_at: string; is_dismissed: boolean }

export type TypeData = TaskTypeData | IdeaTypeData | NoteTypeData | ReminderTypeData | null;

export interface Item {
  id:         ItemId;
  user_id:    string;
  title:      string;
  body?:      string;
  item_type:  ItemType;
  status:     ItemStatus;
  type_data?: TypeData;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id:         TagId;
  user_id:    string;
  name:       string;
  count?:     number;
  created_at: string;
  updated_at: string;
}

export enum ViewType {
  ActionableTasks = 'ActionableTasks',
  RecentItems     = 'RecentItems',
  TagCloud        = 'TagCloud',
  ItemsByTag      = 'ItemsByTag',
  BlockedTasks    = 'BlockedTasks',
  OverdueTasks    = 'OverdueTasks',
  DependencyGraph = 'DependencyGraph',
  QuickCapture    = 'QuickCapture',
  Notes           = 'Notes',
  Ideas           = 'Ideas',
}

export interface BlockConfig {
  tag_id?:          TagId;
  filter_tag_id?:   TagId;
  group_by_maturity?: boolean;
  limit?:           number;
  root_item_id?:    ItemId;
  depth?:           number;
}

export interface Block {
  id:           BlockId;
  dashboard_id: DashboardId;
  user_id:      string;
  view_type:    ViewType;
  title?:       string;
  row:          number;
  column:       number;
  config?:      BlockConfig;
  created_at:   string;
  updated_at:   string;
}

export interface Dashboard {
  id:         DashboardId;
  user_id:    string;
  columns:    number;
  created_at: string;
  updated_at: string;
}

export interface DashboardResponse {
  dashboard: Dashboard;
  blocks:    Block[];
}

export interface ApiError {
  code:    string;
  message: string;
  context?: Record<string, unknown>;
}
