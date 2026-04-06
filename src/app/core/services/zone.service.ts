import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateZoneDto, UpdateZoneDto, ZoneDto } from '../models/zone.model';
import { PagedResponse, PaginationRequest } from '../models/pagination.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class ZoneService {
  private readonly api = inject(BaseApiService);

  getAll(request: PaginationRequest): Observable<PagedResponse<ZoneDto>> {
    return this.api.getWithQuery<PagedResponse<ZoneDto>>('zone', {
      page: request.page,
      size: request.size
    });
  }

  getById(id: number): Observable<ZoneDto> {
    return this.api.get<ZoneDto>(`zone/${id}`);
  }

  create(payload: CreateZoneDto): Observable<{ id: number } | { Id: number }> {
    return this.api.post<{ id: number } | { Id: number }>('zone/create', payload);
  }

  update(payload: UpdateZoneDto): Observable<void> {
    return this.api.post<void>('zone/update', payload);
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('zone/delete', id);
  }
}
