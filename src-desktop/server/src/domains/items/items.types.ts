import { ItemType, TypeData, PaginationParams } from '../../types';

export interface CaptureItemInput {
  title: string;
  body?: string;
}

export interface UpdateItemInput {
  title?: string;
  body?: string;
  type_data?: TypeData;
  color?: string | null;
}

export interface PromoteItemInput {
  new_type: ItemType;
  type_data?: TypeData;
}

export interface SearchItemsInput extends PaginationParams {
  search_text: string;
}

export interface GetItemsByTypeInput extends PaginationParams {
  item_type: ItemType;
}
