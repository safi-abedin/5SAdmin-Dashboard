import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { Role } from '../../core/models/role.model';
import {
  DashboardTwoCategoryScoreDto,
  DashboardTwoCompanyOption,
  DashboardTwoFeedbackSummaryDto,
  DashboardTwoRecentAuditDto,
  DashboardTwoSummaryDto,
  DashboardTwoTopPerformerDto,
  DashboardTwoTrendDto,
  DashboardTwoUserOption,
  DashboardTwoZonePerformanceDto
} from '../../core/models/dashboard-two.model';
import { UserProfileResponseDto } from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { DashboardTwoService } from '../../core/services/dashboard-two.service';
import { ProfileService } from '../../core/services/profile.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { FiltersComponent } from './components/filters.component';
import { FeedbackChartComponent } from './components/feedback-chart.component';
import { CategoryChartComponent } from './components/category-chart.component';
import { PerformersComponent } from './components/performers.component';
import { RecentAuditsComponent } from './components/recent-audits.component';
import { SummaryCardsComponent } from './components/summary-cards.component';
import { TrendChartComponent } from './components/trend-chart.component';
import { ZoneChartComponent } from './components/zone-chart.component';

@Component({
  selector: 'app-dashboard-two',
  imports: [
    FiltersComponent,
    SummaryCardsComponent,
    TrendChartComponent,
    CategoryChartComponent,
    ZoneChartComponent,
    PerformersComponent,
    FeedbackChartComponent,
    RecentAuditsComponent
  ],
  templateUrl: './dashboard-two.component.html',
  styleUrl: './dashboard-two.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTwoComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserManagementService);
  private readonly dashboardService = inject(DashboardTwoService);

  protected readonly isSuperAdmin = computed(() => this.authService.getRole() === Role.SUPER_ADMIN);
  protected readonly loggedInCompanyId = computed(() => this.authService.getCompanyId());
  protected readonly selectedCompanyId = signal<number | null>(this.authService.getCompanyId());
  protected readonly selectedUserId = signal<number | null>(null);
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  protected readonly profile = signal<UserProfileResponseDto | null>(null);
  protected readonly companies = signal<DashboardTwoCompanyOption[]>([]);
  protected readonly users = signal<DashboardTwoUserOption[]>([]);

  protected readonly summary = signal<DashboardTwoSummaryDto | null>(null);
  protected readonly trend = signal<DashboardTwoTrendDto[]>([]);
  protected readonly categoryScores = signal<DashboardTwoCategoryScoreDto[]>([]);
  protected readonly zonePerformance = signal<DashboardTwoZonePerformanceDto[]>([]);
  protected readonly topPerformers = signal<DashboardTwoTopPerformerDto[]>([]);
  protected readonly recentAudits = signal<DashboardTwoRecentAuditDto[]>([]);
  protected readonly feedbackSummary = signal<DashboardTwoFeedbackSummaryDto | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly isLoadingProfile = signal(false);
  protected readonly isLoadingCompanies = signal(false);
  protected readonly isLoadingUsers = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly companyName = computed(() => this.profile()?.companyName || 'All company data');
  protected readonly userName = computed(() => this.profile()?.name || this.authService.getUsername() || 'Dashboard viewer');
  protected readonly selectedCompanyName = computed(() => {
    const selectedCompanyId = this.selectedCompanyId();

    if (!selectedCompanyId) {
      return this.isSuperAdmin() ? 'Select a company' : this.profile()?.companyName || 'Assigned company';
    }

    if (this.isSuperAdmin()) {
      return this.companies().find((company) => company.id === selectedCompanyId)?.companyName ||
        'Selected company';
    }

    return this.profile()?.companyName || 'Assigned company';
  });

  constructor() {
    this.bootstrap();
  }

  protected onCompanyChange(companyId: number | null): void {
    this.selectedCompanyId.set(companyId);
    this.selectedUserId.set(null);
    this.users.set([]);

    if (companyId === null) {
      this.clearDashboardData();
      this.notice.set('Select a company to load dashboard data.');
      return;
    }

    this.notice.set(null);
    this.loadUsersForCompany(companyId);
    this.loadDashboardData();
  }

  protected onUserChange(userId: number | null): void {
    this.selectedUserId.set(userId);
    this.loadDashboardData();
  }

  protected onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.loadDashboardData();
  }

  protected onToDateChange(value: string): void {
    this.toDate.set(value);
    this.loadDashboardData();
  }

  protected refreshDashboard(): void {
    this.loadDashboardData();
  }

  private bootstrap(): void {
    this.isLoadingProfile.set(true);

    this.profileService
      .getMe()
      .pipe(finalize(() => this.isLoadingProfile.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);

          if (!this.isSuperAdmin()) {
            this.selectedCompanyId.set(profile.companyId ?? this.loggedInCompanyId());
          }

          if (this.isSuperAdmin()) {
            this.loadCompanies();
            if (this.selectedCompanyId()) {
              this.loadUsersForCompany(this.selectedCompanyId() as number);
              this.loadDashboardData();
            } else {
              this.notice.set('Select a company to load dashboard data.');
            }
            return;
          }

          if (this.selectedCompanyId()) {
            this.loadUsersForCompany(this.selectedCompanyId() as number);
            this.loadDashboardData();
          } else {
            this.error.set('The logged in account is not linked to a company.');
          }
        },
        error: () => {
          this.error.set('Unable to load profile details for dashboard two.');
        }
      });
  }

  private loadCompanies(): void {
    this.isLoadingCompanies.set(true);

    this.companyService
      .getAll({ page: 1, size: 500 })
      .pipe(finalize(() => this.isLoadingCompanies.set(false)))
      .subscribe({
        next: (response) => {
          const companies = (response.data ?? [])
            .filter((company) => company.id > 0)
            .map((company) => ({
              id: company.id,
              companyName: company.companyName
            }));

          this.companies.set(companies);
        },
        error: () => {
          this.companies.set([]);
          this.error.set('Unable to load company options for dashboard two.');
        }
      });
  }

  private loadUsersForCompany(companyId: number): void {
    this.isLoadingUsers.set(true);

    this.userService
      .getAll({ page: 1, size: 500 })
      .pipe(finalize(() => this.isLoadingUsers.set(false)))
      .subscribe({
        next: (response) => {
          const users = (response.data ?? [])
            .filter((user) => user.companyId === companyId)
            .map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
              companyId: user.companyId
            }))
            .sort((left, right) => left.name.localeCompare(right.name));

          this.users.set(users);

          if (this.selectedUserId() && !users.some((user) => user.id === this.selectedUserId())) {
            this.selectedUserId.set(null);
          }
        },
        error: () => {
          this.users.set([]);
          this.error.set('Unable to load user options for dashboard two.');
        }
      });
  }

  private loadDashboardData(): void {
    const companyId = this.selectedCompanyId();

    if (!companyId) {
      this.clearDashboardData();
      this.notice.set('Select a company to load dashboard data.');
      return;
    }

    this.notice.set(null);
    this.error.set(null);
    this.isLoading.set(true);

    const query = this.createQuery(companyId);

    forkJoin({
      summary: this.dashboardService.getSummary(query),
      trend: this.dashboardService.getTrend(query),
      categoryScores: this.dashboardService.getCategoryScores(query),
      zonePerformance: this.dashboardService.getZonePerformance(query),
      topPerformers: this.dashboardService.getTopPerformers(query),
      recentAudits: this.dashboardService.getRecentAudits(query),
      feedbackSummary: this.dashboardService.getFeedbackSummary(query)
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.summary.set(data.summary);
          this.trend.set(data.trend);
          this.categoryScores.set(data.categoryScores);
          this.zonePerformance.set(data.zonePerformance);
          this.topPerformers.set(data.topPerformers);
          this.recentAudits.set(data.recentAudits);
          this.feedbackSummary.set(data.feedbackSummary);
        },
        error: () => {
          this.clearDashboardData();
          this.error.set('Unable to load dashboard two analytics.');
        }
      });
  }

  private clearDashboardData(): void {
    this.summary.set(null);
    this.trend.set([]);
    this.categoryScores.set([]);
    this.zonePerformance.set([]);
    this.topPerformers.set([]);
    this.recentAudits.set([]);
    this.feedbackSummary.set(null);
  }

  private createQuery(companyId: number) {
    return {
      companyId,
      userId: this.selectedUserId(),
      fromDate: this.fromDate() || null,
      toDate: this.toDate() || null
    };
  }
}
