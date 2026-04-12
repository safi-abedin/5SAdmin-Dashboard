import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuditPaginationRequest,
  AuditPagedResponse,
  AuditResponseDto
} from '../models/audit-record.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class AuditRecordService {
  private readonly api = inject(BaseApiService);

  getAll(request: AuditPaginationRequest): Observable<AuditPagedResponse> {
    return this.api.getWithQuery<AuditPagedResponse>('audit', this.toQuery(request));
  }

  getById(id: number): Observable<AuditResponseDto> {
    return this.api.get<AuditResponseDto>(`audit/${id}`);
  }

  getPdf(id: number): Observable<Blob> {
    return this.api.getBlob(`audit/${id}/pdf`);
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('audit/delete', id);
  }

  private toQuery(
    request: AuditPaginationRequest
  ): Record<string, string | number | boolean | null | undefined> {
    return {
      page: request.page,
      size: request.size,
      sortBy: request.sortBy,
      sortDirection: request.sortDirection,
      companyId: request.companyId,
      zoneId: request.zoneId,
      auditorName: request.auditorName,
      status: request.status,
      minScore: request.minScore,
      maxScore: request.maxScore,
      createdFrom: request.createdFrom,
      createdTo: request.createdTo,
      auditDateFrom: request.auditDateFrom,
      auditDateTo: request.auditDateTo
    };
  }
}
