import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistDto, CreateChecklistDto, UpdateChecklistDto } from '../models/checklist.model';
import { PagedResponse, PaginationRequest } from '../models/pagination.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private readonly api = inject(BaseApiService);

  getAll(request: PaginationRequest): Observable<PagedResponse<ChecklistDto>> {
    return this.api.getWithQuery<PagedResponse<ChecklistDto>>('checklist', {
      page: request.page,
      size: request.size
    });
  }

  getAllWithoutPagination(): Observable<ChecklistDto[]> {
    return this.api.get<ChecklistDto[]>('checklist/all');
  }

  getById(id: number): Observable<ChecklistDto> {
    return this.api.get<ChecklistDto>(`checklist/${id}`);
  }

  create(payload: CreateChecklistDto): Observable<{ id: number } | { Id: number }> {
    return this.api.post<{ id: number } | { Id: number }>('checklist/create', payload);
  }

  update(payload: UpdateChecklistDto): Observable<void> {
    return this.api.post<void>('checklist/update', payload);
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('checklist/delete', id);
  }
}
