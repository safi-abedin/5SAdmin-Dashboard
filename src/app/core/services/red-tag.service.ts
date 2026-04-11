import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RedTagPaginationRequest,
  RedTagPagedResponse,
  RedTagResponseDto
} from '../models/red-tag.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class RedTagService {
  private readonly api = inject(BaseApiService);

  getAll(request: RedTagPaginationRequest): Observable<RedTagPagedResponse> {
    return this.api.getWithQuery<RedTagPagedResponse>('redtag', this.toQuery(request));
  }

  getById(id: number): Observable<RedTagResponseDto> {
    return this.api.get<RedTagResponseDto>(`redtag/${id}`);
  }

  private toQuery(
    request: RedTagPaginationRequest
  ): Record<string, string | number | boolean | null | undefined> {
    return {
      page: request.page,
      size: request.size,
      sortBy: request.sortBy,
      sortDirection: request.sortDirection,
      companyId: request.companyId,
      responsiblePerson: request.responsiblePerson,
      status: request.status,
      createdFrom: request.createdFrom,
      createdTo: request.createdTo,
      identifiedDateFrom: request.identifiedDateFrom,
      identifiedDateTo: request.identifiedDateTo,
      closingDateFrom: request.closingDateFrom,
      closingDateTo: request.closingDateTo
    };
  }
}