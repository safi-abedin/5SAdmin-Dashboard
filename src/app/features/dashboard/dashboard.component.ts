import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs/operators';
import {
  AnalyticsAdvancedDashboardDto,
  AuditorDashboardResponseDto,
  DashboardStatusCountDto,
  DashboardTrendPointDto,
  DashboardZoneInsightDto
} from '../../core/models/dashboard.model';
import { Role } from '../../core/models/role.model';
import { UserDto } from '../../core/models/user-management.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../../core/services/user-management.service';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserManagementService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);

  protected readonly role = computed(() => this.authService.getRole());
  protected readonly loggedInCompanyId = computed(() => this.authService.getCompanyId());
  protected readonly isSuperAdmin = computed(() => this.role() === Role.SUPER_ADMIN);

  protected readonly viewMode = signal<'company' | 'auditor'>('company');
  protected readonly selectedPeriodDays = signal(90);
  protected readonly selectedCompanyId = signal<number | null>(this.authService.getCompanyId());
  protected readonly selectedAuditorId = signal<number | null>(null);

  protected readonly periodOptions = [30, 60, 90, 180, 365];

  protected readonly companies = signal<Array<{ id: number; name: string }>>([]);
  protected readonly auditors = signal<UserDto[]>([]);

  protected readonly isCompanyLoading = signal(false);
  protected readonly isAuditorListLoading = signal(false);
  protected readonly isAuditorLoading = signal(false);
  protected readonly dashboardError = signal<string | null>(null);
  protected readonly auditorError = signal<string | null>(null);

  protected readonly analytics = signal<AnalyticsAdvancedDashboardDto | null>(null);
  protected readonly auditorAnalytics = signal<AuditorDashboardResponseDto | null>(null);

  protected readonly companyLastUpdated = computed(() => this.analytics()?.generatedAt ?? null);
  protected readonly auditorLastUpdated = computed(() => this.auditorAnalytics()?.generatedAt ?? null);

  protected readonly completionRate = computed(() => {
    const data = this.analytics();
    if (!data || data.totalAudits === 0) {
      return 0;
    }

    const completed = this.findStatusCount(data.auditStatusBreakdown, 'completed');
    return (completed / data.totalAudits) * 100;
  });

  protected readonly auditorCompletionRate = computed(() => {
    const data = this.auditorAnalytics();
    if (!data || data.totalAudits === 0) {
      return 0;
    }

    return (data.completedAudits / data.totalAudits) * 100;
  });

  protected readonly feedbackTotal = computed(() => {
    const feedback = this.analytics()?.feedbackSentiment;
    if (!feedback) {
      return 0;
    }

    return feedback.goodCount + feedback.badCount;
  });

  protected readonly feedbackGoodRate = computed(() => {
    const feedback = this.analytics()?.feedbackSentiment;
    const total = this.feedbackTotal();
    if (!feedback || total === 0) {
      return 0;
    }

    return (feedback.goodCount / total) * 100;
  });

  protected readonly feedbackBadRate = computed(() => {
    const feedback = this.analytics()?.feedbackSentiment;
    const total = this.feedbackTotal();
    if (!feedback || total === 0) {
      return 0;
    }

    return (feedback.badCount / total) * 100;
  });

  constructor() {
    this.bootstrap();
  }

  protected setViewMode(mode: 'company' | 'auditor'): void {
    this.viewMode.set(mode);

    if (mode === 'auditor' && !this.selectedAuditorId() && this.auditors().length > 0) {
      this.selectedAuditorId.set(this.auditors()[0].id);
      this.loadAuditorAnalytics();
    }
  }

  protected onPeriodChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.selectedPeriodDays.set(parsed);
    this.loadCompanyAnalytics();
  }

  protected onCompanyChange(value: string): void {
    const parsed = Number(value);
    const companyId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.selectedCompanyId.set(companyId);
    this.selectedAuditorId.set(null);
    this.auditorAnalytics.set(null);
    this.loadCompanyAnalytics();
    this.loadAuditors();
  }

  protected onAuditorChange(value: string): void {
    const parsed = Number(value);
    const userId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.selectedAuditorId.set(userId);

    if (userId) {
      this.loadAuditorAnalytics();
    }
  }

  protected refreshCompanyAnalytics(): void {
    this.loadCompanyAnalytics();
  }

  protected refreshAuditorAnalytics(): void {
    this.loadAuditorAnalytics();
  }

  protected maxCountFromTrend(trend: DashboardTrendPointDto[] | undefined): number {
    if (!trend || trend.length === 0) {
      return 1;
    }

    return Math.max(1, ...trend.map((point) => point.count));
  }

  protected maxCountFromStatus(values: DashboardStatusCountDto[] | undefined): number {
    if (!values || values.length === 0) {
      return 1;
    }

    return Math.max(1, ...values.map((item) => item.count));
  }

  protected maxCountFromZone(values: DashboardZoneInsightDto[] | undefined): number {
    if (!values || values.length === 0) {
      return 1;
    }

    return Math.max(1, ...values.map((item) => item.auditCount));
  }

  private bootstrap(): void {
    if (this.isSuperAdmin()) {
      this.loadCompanies();
    }

    this.loadCompanyAnalytics();
    this.loadAuditors();
  }

  private loadCompanies(): void {
    this.companyService.getAll({ page: 1, size: 500 }).subscribe({
      next: (response) => {
        const list = response.data ?? [];
        this.companies.set(
          list
            .filter((item) => item.id > 0)
            .map((item) => ({
              id: item.id,
              name: item.companyName
            }))
        );
      },
      error: () => {
        this.companies.set([]);
        this.toastService.error('Unable to load company filter options.');
      }
    });
  }

  private loadCompanyAnalytics(): void {
    this.dashboardError.set(null);
    this.isCompanyLoading.set(true);

    this.dashboardService
      .getAdvanced(this.resolveEffectiveCompanyId(), this.selectedPeriodDays())
      .pipe(finalize(() => this.isCompanyLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.analytics.set(response);
        },
        error: () => {
          this.analytics.set(null);
          this.dashboardError.set('Unable to load analytics dashboard data.');
        }
      });
  }

  private loadAuditors(): void {
    this.auditorError.set(null);
    this.isAuditorListLoading.set(true);

    this.userService
      .getAll({ page: 1, size: 500 })
      .pipe(finalize(() => this.isAuditorListLoading.set(false)))
      .subscribe({
        next: (response) => {
          const activeCompanyId = this.resolveEffectiveCompanyId();
          const users = response.data ?? [];
          const filtered = users.filter((user) => {
            const isAuditor = user.role.trim().toLowerCase() === 'auditor';
            const companyMatches =
              activeCompanyId === null ||
              user.companyId === null ||
              user.companyId === activeCompanyId;

            return isAuditor && companyMatches;
          });

          this.auditors.set(filtered);

          const currentAuditorId = this.selectedAuditorId();
          const hasCurrentSelection = currentAuditorId
            ? filtered.some((user) => user.id === currentAuditorId)
            : false;

          const nextAuditorId = hasCurrentSelection
            ? currentAuditorId
            : (filtered[0]?.id ?? null);

          this.selectedAuditorId.set(nextAuditorId);

          if (nextAuditorId) {
            this.loadAuditorAnalytics();
          }
        },
        error: () => {
          this.auditors.set([]);
          this.selectedAuditorId.set(null);
          this.auditorAnalytics.set(null);
          this.auditorError.set('Unable to load auditors.');
        }
      });
  }

  private loadAuditorAnalytics(): void {
    const userId = this.selectedAuditorId();
    if (!userId) {
      this.auditorAnalytics.set(null);
      return;
    }

    this.auditorError.set(null);
    this.isAuditorLoading.set(true);

    this.dashboardService
      .getAuditorByUserId(userId)
      .pipe(finalize(() => this.isAuditorLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.auditorAnalytics.set(response);
        },
        error: () => {
          this.auditorAnalytics.set(null);
          this.auditorError.set('Unable to load auditor dashboard data.');
        }
      });
  }

  private resolveEffectiveCompanyId(): number | null {
    if (this.isSuperAdmin()) {
      return this.selectedCompanyId();
    }

    return this.loggedInCompanyId();
  }

  private findStatusCount(values: DashboardStatusCountDto[], targetStatus: string): number {
    const match = values.find((item) => item.status.trim().toLowerCase() === targetStatus);
    return match?.count ?? 0;
  }
}
