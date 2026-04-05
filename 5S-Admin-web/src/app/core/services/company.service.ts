import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CompanyDto, CreateCompanyDto, UpdateCompanyDto } from '../models/company.model';
import { PagedResponse, PaginationRequest } from '../models/pagination.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = inject(BaseApiService);

  getAll(request: PaginationRequest): Observable<PagedResponse<CompanyDto>> {
    return this.api.getWithQuery<PagedResponse<CompanyDto>>('company', {
      page: request.page,
      size: request.size
    });
  }

  getById(id: number): Observable<CompanyDto> {
    return this.api.get<CompanyDto>(`company/${id}`);
  }

  create(payload: CreateCompanyDto): Observable<{ id: number } | { Id: number }> {
    return this.api.post<{ id: number } | { Id: number }>('company/create', payload);
  }

  update(payload: UpdateCompanyDto): Observable<void> {
    return this.api.post<void>('company/update', payload);
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('company/delete', id);
  }
}
