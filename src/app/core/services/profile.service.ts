import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CompanyBrandingUpdateResponseDto,
  UserProfileResponseDto
} from '../models/profile.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(BaseApiService);

  getMe(): Observable<UserProfileResponseDto> {
    return this.api.get<UserProfileResponseDto>('profile/me');
  }

  updateCompanyBranding(formData: FormData): Observable<CompanyBrandingUpdateResponseDto> {
    return this.api.post<CompanyBrandingUpdateResponseDto>('profile/company-branding', formData);
  }
}
