import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateRedTagDto,
  RedTagPaginationRequest,
  RedTagPagedResponse,
  RedTagResponseDto,
  UpdateRedTagDto
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

  create(payload: CreateRedTagDto): Observable<{ id: number } | { Id: number }> {
    return this.api.post<{ id: number } | { Id: number }>('redtag/create', this.toFormData(payload));
  }

  update(payload: UpdateRedTagDto): Observable<void> {
    return this.api.post<void>('redtag/update', this.toFormData(payload));
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('redtag/delete', id);
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

  private toFormData(payload: CreateRedTagDto | UpdateRedTagDto): FormData {
    const formData = new FormData();

    if ('id' in payload) {
      formData.append('Id', String(payload.id));
    }

    formData.append('ItemName', payload.itemName);
    formData.append('Description', payload.description);
    formData.append('Quantity', String(payload.quantity));
    formData.append('Location', payload.location);
    formData.append('ResponsiblePerson', payload.responsiblePerson);
    formData.append('Status', String(payload.status));

    if (payload.identifiedDate) {
      formData.append('IdentifiedDate', payload.identifiedDate);
    }

    if (payload.closingDate) {
      formData.append('ClosingDate', payload.closingDate);
    }

    for (const photo of payload.photos) {
      formData.append('Photos', photo);
    }

    return formData;
  }
}