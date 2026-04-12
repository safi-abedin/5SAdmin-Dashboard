import { PagedResponse } from './pagination.model';

export enum AuditStatus {
  Draft = 1,
  Submitted = 2,
  Reviewed = 3
}

export interface AuditItemDto {
  id: number | null;
  checklistItemId: number;
  checklistCatagoryId?: number;
  catagoryName?: string;
  catagoryOrder?: number;
  checkingItemName?: string;
  evaluationCriteria?: string;
  order?: number;
  score: number;
}

export interface FeedBackItemDto {
  id: number | null;
  comment: string | null;
  imageUrls: string[] | null;
  good: boolean | null;
  bad: boolean | null;
}

export interface AuditResponseDto {
  id: number;
  zoneId: number;
  zoneName?: string;
  auditorName: string;
  auditeeName: string;
  department: string;
  auditDate: string;
  createdAt: string;
  totalScore: number;
  percentage: number;
  status: string | number;
  items: AuditItemDto[];
  feedBackItems: FeedBackItemDto[] | null;
}

export interface AuditPaginationRequest {
  page: number;
  size: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc' | null;
  companyId?: number | null;
  zoneId?: number | null;
  auditorName?: string | null;
  status?: string | null;
  minScore?: number | null;
  maxScore?: number | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  auditDateFrom?: string | null;
  auditDateTo?: string | null;
}

export type AuditPagedResponse = PagedResponse<AuditResponseDto>;
