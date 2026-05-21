import { ViewType, BlockConfig } from '../../types';

export interface AddBlockInput {
  view_type: ViewType;
  title?: string;
  row: number;
  column: number;
  config?: BlockConfig;
}

export interface UpdateBlockInput {
  view_type?: ViewType;
  title?: string;
  row?: number;
  column?: number;
  config?: BlockConfig;
}

export interface BlockPosition {
  block_id: string;
  row: number;
  column: number;
}
