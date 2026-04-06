export interface PaginationRequest {
  page: number;
  size: number;
}

export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  size: number;
  hasNext: boolean;
}
