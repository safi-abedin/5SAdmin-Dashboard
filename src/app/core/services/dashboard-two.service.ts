import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DashboardTwoCategoryScoreDto,
  DashboardTwoFeedbackSummaryDto,
  DashboardTwoQueryParams,
  DashboardTwoRecentAuditDto,
  DashboardTwoSummaryDto,
  DashboardTwoTopPerformerDto,
  DashboardTwoTrendDto,
  DashboardTwoZonePerformanceDto
} from '../models/dashboard-two.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class DashboardTwoService {
  private readonly api = inject(BaseApiService);

  getSummary(query: DashboardTwoQueryParams): Observable<DashboardTwoSummaryDto> {
    return this.api.getWithQuery<DashboardTwoSummaryDto>('dashboard/summary', this.toQueryRecord(query));
  }

  getTrend(query: DashboardTwoQueryParams): Observable<DashboardTwoTrendDto[]> {
    return this.api.getWithQuery<DashboardTwoTrendDto[]>('dashboard/trend', this.toQueryRecord(query));
  }

  getCategoryScores(query: DashboardTwoQueryParams): Observable<DashboardTwoCategoryScoreDto[]> {
    return this.api.getWithQuery<DashboardTwoCategoryScoreDto[]>(
      'dashboard/category-scores',
      this.toQueryRecord(query)
    );
  }

  getZonePerformance(query: DashboardTwoQueryParams): Observable<DashboardTwoZonePerformanceDto[]> {
    return this.api.getWithQuery<DashboardTwoZonePerformanceDto[]>(
      'dashboard/zone-performance',
      this.toQueryRecord(query)
    );
  }

  getTopPerformers(query: DashboardTwoQueryParams): Observable<DashboardTwoTopPerformerDto[]> {
    return this.api.getWithQuery<DashboardTwoTopPerformerDto[]>(
      'dashboard/top-performers',
      this.toQueryRecord(query)
    );
  }

  getRecentAudits(query: DashboardTwoQueryParams): Observable<DashboardTwoRecentAuditDto[]> {
    return this.api.getWithQuery<DashboardTwoRecentAuditDto[]>(
      'dashboard/recent-audits',
      this.toQueryRecord(query)
    );
  }

  getFeedbackSummary(query: DashboardTwoQueryParams): Observable<DashboardTwoFeedbackSummaryDto> {
    return this.api.getWithQuery<DashboardTwoFeedbackSummaryDto>(
      'dashboard/feedback-summary',
      this.toQueryRecord(query)
    );
  }

  private toQueryRecord(query: DashboardTwoQueryParams): Record<string, string | number | boolean | null | undefined> {
    return {
      companyId: query.companyId,
      userId: query.userId,
      days: query.days,
      fromDate: query.fromDate,
      toDate: query.toDate
    };
  }
}