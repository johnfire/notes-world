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
  count: number;
  created_at: string;
  updated_at: string;
}
