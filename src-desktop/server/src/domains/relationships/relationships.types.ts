export interface CreateTagInput {
  name: string;
}

export interface RenameTagInput {
  new_name: string;
}

export interface TagWithCount {
  id: string;
  user_id: string;
  name: string;
  tag_source: 'folder' | 'file' | 'semantic' | 'manual';
  color: string | null;
  count: number;
  created_at: string;
  updated_at: string;
}
