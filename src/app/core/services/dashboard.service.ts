import { Injectable, inject } from '@angular/core';
import {
  AnalyticsAdvancedDashboardDto,
  AnalyticsBasicDashboardDto,
  AuditorDashboardResponseDto
} from '../models/dashboard.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(BaseApiService);

  getBasic(companyId: number | null, days = 30) {
    return this.api.getWithQuery<AnalyticsBasicDashboardDto>('AnalyticsDashboard/basic', {
      companyId,
      days
    });
  }

  getAdvanced(companyId: number | null, days = 90) {
    return this.api.getWithQuery<AnalyticsAdvancedDashboardDto>('AnalyticsDashboard/advanced', {
      companyId,
      days
    });
  }

  getAuditorByUserId(userId: number) {
    return this.api.get<AuditorDashboardResponseDto>(`AuditorDashboard/user/${userId}`);
  }
}
