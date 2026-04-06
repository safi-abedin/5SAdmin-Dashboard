import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResponse, PaginationRequest } from '../models/pagination.model';
import { CreateUserDto, UpdateUserDto, UserDto } from '../models/user-management.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(BaseApiService);

  getAll(request: PaginationRequest): Observable<PagedResponse<UserDto>> {
    return this.api.getWithQuery<PagedResponse<UserDto>>('usermanagement', {
      page: request.page,
      size: request.size
    });
  }

  getById(id: number): Observable<UserDto> {
    return this.api.get<UserDto>(`usermanagement/${id}`);
  }

  create(payload: CreateUserDto): Observable<{ id: number } | { Id: number }> {
    return this.api.post<{ id: number } | { Id: number }>('usermanagement/create', payload);
  }

  update(payload: UpdateUserDto): Observable<void> {
    return this.api.post<void>('usermanagement/update', payload);
  }

  delete(id: number): Observable<void> {
    return this.api.post<void>('usermanagement/delete', id);
  }
}
