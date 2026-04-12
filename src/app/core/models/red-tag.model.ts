import { PagedResponse } from './pagination.model';

export enum RedTagStatus {
  Open = 1,
  InProgress = 2,
  Closed = 3
}

export interface RedTagResponseDto {
  id: number;
  itemName: string;
  description: string;
  quantity: number;
  location: string;
  photoUrl: string[];
  responsiblePerson: string;
  status: string | number;
  identifiedDate: string;
  closingDate: string | null;
  createdAt: string;
}

export interface CreateRedTagDto {
  itemName: string;
  description: string;
  quantity: number;
  location: string;
  photos: File[];
  responsiblePerson: string;
  status: RedTagStatus;
  identifiedDate: string | null;
  closingDate: string | null;
}

export interface UpdateRedTagDto extends CreateRedTagDto {
  id: number;
}

export interface RedTagPaginationRequest {
  page: number;
  size: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc' | null;
  companyId?: number | null;
  responsiblePerson?: string | null;
  status?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  identifiedDateFrom?: string | null;
  identifiedDateTo?: string | null;
  closingDateFrom?: string | null;
  closingDateTo?: string | null;
}

export type RedTagPagedResponse = PagedResponse<RedTagResponseDto>;
