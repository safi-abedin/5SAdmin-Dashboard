import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
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
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly companyStatusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('companyStatusChart');
  private readonly redTagStatusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('redTagStatusChart');
  private readonly companyTrendCanvas = viewChild<ElementRef<HTMLCanvasElement>>('companyTrendChart');
  private readonly departmentInsightsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('departmentInsightsChart');
  private readonly feedbackSentimentCanvas = viewChild<ElementRef<HTMLCanvasElement>>('feedbackSentimentChart');
  private readonly lowPerformanceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('lowPerformanceChart');
  private readonly auditorStatusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('auditorStatusChart');
  private readonly auditorTrendCanvas = viewChild<ElementRef<HTMLCanvasElement>>('auditorTrendChart');
  private readonly zonePerformanceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('zonePerformanceChart');
  private readonly zoneInsightsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('zoneInsightsChart');

  private companyStatusChart: Chart | null = null;
  private redTagStatusChart: Chart | null = null;
  private companyTrendChart: Chart | null = null;
  private departmentInsightsChart: Chart | null = null;
  private feedbackSentimentChart: Chart | null = null;
  private lowPerformanceChart: Chart | null = null;
  private auditorStatusChart: Chart | null = null;
  private auditorTrendChart: Chart | null = null;
  private zonePerformanceChart: Chart | null = null;
  private zoneInsightsChart: Chart | null = null;

  private readonly authService = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserManagementService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);

  protected readonly role = computed(() => this.authService.getRole());
  protected readonly loggedInCompanyId = computed(() => this.authService.getCompanyId());
  protected readonly isSuperAdmin = computed(() => this.role() === Role.SUPER_ADMIN);

  protected readonly viewMode = signal<'company' | 'auditor'>('company');
  protected readonly selectedPeriodDays = signal(30);
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

  protected readonly lowPerformanceColumns: readonly TableColumn[] = [
    { field: 'id', header: 'Audit ID', sortable: true, width: '80px' },
    { field: 'zoneName', header: 'Zone', sortable: true, width: '120px' },
    { field: 'auditDateLabel', header: 'Date', sortable: true, width: '120px' },
    { field: 'percentage', header: 'Score', sortable: true, width: '100px', align: 'end' },
    { field: 'status', header: 'Status', sortable: true, width: '100px' }
  ];

  protected readonly auditorAuditColumns: readonly TableColumn[] = [
    { field: 'id', header: 'Audit ID', sortable: true, width: '80px' },
    { field: 'zoneName', header: 'Zone', sortable: true, width: '120px' },
    { field: 'auditDateLabel', header: 'Date', sortable: true, width: '120px' },
    { field: 'percentage', header: 'Score', sortable: true, width: '100px', align: 'end' },
    { field: 'status', header: 'Status', sortable: true, width: '100px' }
  ];

  protected readonly lowPerformanceRows = computed<readonly TableRow[]>(() => {
    const audits = this.analytics()?.recentLowPerformanceAudits ?? [];
    return audits.map((audit) => ({
      ...audit,
      zoneName: this.getZoneName(audit.zoneId),
      auditDateLabel: new Date(audit.auditDate).toLocaleDateString()
    }));
  });

  protected readonly auditorRecentRows = computed<readonly TableRow[]>(() => {
    const audits = this.auditorAnalytics()?.recentAudits ?? [];
    return audits.map((audit) => ({
      ...audit,
      zoneName: this.getAuditorZoneName(audit.zoneId),
      auditDateLabel: new Date(audit.auditDate).toLocaleDateString()
    }));
  });

  constructor() {
    Chart.register(...registerables);
    effect(() => {
      this.analytics();
      this.renderCompanyCharts();
    });

    effect(() => {
      this.auditorAnalytics();
      this.renderAuditorCharts();
    });

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

  protected viewAudit(row: TableRow): void {
    // Navigate to audit detail view
    console.log('View audit:', this.extractAuditId(row));
  }

  protected deleteAudit(row: TableRow): void {
    const auditId = this.extractAuditId(row);
    if (confirm('Are you sure you want to delete this audit?')) {
      console.log('Delete audit:', auditId);
    }
  }

  protected downloadAuditPdf(row: TableRow): void {
    console.log('Download PDF for audit:', this.extractAuditId(row));
  }

  private extractAuditId(row: TableRow): number {
    const value = row['id'];
    return typeof value === 'number' ? value : Number(value ?? 0);
  }

  protected getZoneName(zoneId: number): string {
    const data = this.analytics();
    if (!data) return `Zone ${zoneId}`;
    
    const zone = data.zonePerformance?.find(z => z.zoneId === zoneId);
    return zone?.zoneName ?? `Zone ${zoneId}`;
  }

  protected getAuditorZoneName(zoneId: number): string {
    const data = this.auditorAnalytics();
    if (!data) return `Zone ${zoneId}`;
    
    const zone = data.zoneInsights?.find(z => z.zoneId === zoneId);
    return zone?.zoneName ?? `Zone ${zoneId}`;
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

  protected maxCountFromArray(values: any[] | undefined): number {
    if (!values || values.length === 0) {
      return 1;
    }

    return Math.max(1, ...values.map((item) => item.count ?? 0));
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

  private renderCompanyCharts(): void {
    const data = this.analytics();
    if (!data) {
      this.destroyCharts('company');
      return;
    }

    this.companyStatusChart?.destroy();
    this.redTagStatusChart?.destroy();
    this.companyTrendChart?.destroy();
    this.departmentInsightsChart?.destroy();
    this.feedbackSentimentChart?.destroy();
    this.lowPerformanceChart?.destroy();

    this.companyStatusChart = this.buildChart(this.companyStatusCanvas(), {
      type: 'doughnut',
      data: {
        labels: data.auditStatusBreakdown.map((item) => item.status),
        datasets: [
          {
            data: data.auditStatusBreakdown.map((item) => item.count),
            backgroundColor: ['#f59e0b', '#2563eb', '#10b981']
          }
        ]
      }
    });

    this.redTagStatusChart = this.buildChart(this.redTagStatusCanvas(), {
      type: 'doughnut',
      data: {
        labels: data.redTagStatusBreakdown.map((item) => item.status),
        datasets: [
          {
            data: data.redTagStatusBreakdown.map((item) => item.count),
            backgroundColor: ['#ef4444', '#10b981', '#f59e0b']
          }
        ]
      }
    });

    this.companyTrendChart = this.buildChart(this.companyTrendCanvas(), {
      type: 'line',
      data: {
        labels: data.dailyAuditTrend.map((item) => item.label),
        datasets: [
          {
            label: 'Daily audits',
            data: data.dailyAuditTrend.map((item) => item.count),
            borderColor: '#2563eb',
            backgroundColor: 'rgb(37 99 235 / 0.22)',
            tension: 0.35,
            fill: true
          }
        ]
      }
    });

    // Department Insights Chart
    this.departmentInsightsChart = this.buildChart(this.departmentInsightsCanvas(), {
      type: 'bar',
      data: {
        labels: data.departmentInsights.map((item) => item.department),
        datasets: [
          {
            label: 'Average Score %',
            data: data.departmentInsights.map((item) => item.averagePercentage),
            backgroundColor: ['#1d4ed8', '#0ea5e9', '#10b981','#e90e50', 
                          '#c81c97','#dfdf45', '#f6670e','#7a09a0', '#cdccba'],
            borderRadius: 6
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Feedback Sentiment Chart
    this.feedbackSentimentChart = this.buildChart(this.feedbackSentimentCanvas(), {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Negative'],
        datasets: [
          {
            data: [data.feedbackSentiment.goodCount, data.feedbackSentiment.badCount],
            backgroundColor: ['#10b981', '#ef4444']
          }
        ]
      }
    });

    // Recent Low Performance Audits Chart
    const lowPerformanceData = data.recentLowPerformanceAudits.slice(0, 5);
    this.lowPerformanceChart = this.buildChart(this.lowPerformanceCanvas(), {
      type: 'bar',
      data: {
        labels: lowPerformanceData.map((item) => `Audit #${item.id}`),
        datasets: [
          {
            label: 'Performance %',
            data: lowPerformanceData.map((item) => item.percentage),
            backgroundColor: ['#ef4444','#d45757','#ba5959','#8e6161','#8b6c6c','#847c7c','#8f8a8a'],
            borderRadius: 6
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Zone Performance Chart with different colors for each zone
    const zoneColors = ['#3b82f6', '#ef4444'];
    this.zonePerformanceChart = this.buildChart(this.zonePerformanceCanvas(), {
      type: 'bar',
      data: {
        labels: data.zonePerformance.map((item) => item.zoneName),
        datasets: [
          {
            label: 'Average Score %',
            data: data.zonePerformance.map((item) => item.averagePercentage),
            backgroundColor: data.zonePerformance.map((_, idx) => zoneColors[idx % zoneColors.length]),
            borderRadius: 6
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  private renderAuditorCharts(): void {
    const data = this.auditorAnalytics();
    if (!data) {
      this.destroyCharts('auditor');
      return;
    }

    this.auditorStatusChart?.destroy();
    this.auditorTrendChart?.destroy();
    this.zonePerformanceChart?.destroy();
    this.zoneInsightsChart?.destroy();

    this.auditorStatusChart = this.buildChart(this.auditorStatusCanvas(), {
      type: 'bar',
      data: {
        labels: data.auditStatusBreakdown.map((item) => item.status),
        datasets: [
          {
            label: 'Audits',
            data: data.auditStatusBreakdown.map((item) => item.count),
            backgroundColor: ['#1d4ed8', '#0ea5e9', '#10b981']
          }
        ]
      }
    });

    this.auditorTrendChart = this.buildChart(this.auditorTrendCanvas(), {
      type: 'line',
      data: {
        labels: data.monthlyAuditTrend.map((item) => item.label),
        datasets: [
          {
            label: 'Monthly audits',
            data: data.monthlyAuditTrend.map((item) => item.count),
            borderColor: '#1d4ed8',
            backgroundColor: 'rgb(29 78 216 / 0.2)',
            tension: 0.35,
            fill: true
          }
        ]
      }
    });

    // Zone Performance Chart
    this.zonePerformanceChart = this.buildChart(this.zonePerformanceCanvas(), {
      type: 'bar',
      data: {
        labels: data.zoneInsights.map((item) => item.zoneName),
        datasets: [
          {
            label: 'Average Score %',
            data: data.zoneInsights.map((item) => item.averagePercentage),
            backgroundColor:['#d89a1d', '#e90e41', '#10b981'],
            borderRadius: 6
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Zone Insights Chart with different colors for each zone
    const zoneInsightColors = ['#8b5cf6', '#ec4899'];
    this.zoneInsightsChart = this.buildChart(this.zoneInsightsCanvas(), {
      type: 'bar',
      data: {
        labels: data.zoneInsights.map((item) => item.zoneName),
        datasets: [
          {
            label: 'Average Score %',
            data: data.zoneInsights.map((item) => item.averagePercentage),
            backgroundColor: data.zoneInsights.map((_, idx) => zoneInsightColors[idx % zoneInsightColors.length]),
            borderRadius: 6
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  private buildChart(
    canvasRef: ElementRef<HTMLCanvasElement> | undefined,
    config: ChartConfiguration
  ): Chart | null {
    if (!canvasRef?.nativeElement) {
      return null;
    }

    return new Chart(canvasRef.nativeElement, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        ...config.options
      }
    });
  }

  private destroyCharts(scope: 'company' | 'auditor'): void {
    if (scope === 'company') {
      this.companyStatusChart?.destroy();
      this.redTagStatusChart?.destroy();
      this.companyTrendChart?.destroy();
      this.departmentInsightsChart?.destroy();
      this.feedbackSentimentChart?.destroy();
      this.lowPerformanceChart?.destroy();
      this.companyStatusChart = null;
      this.redTagStatusChart = null;
      this.companyTrendChart = null;
      this.departmentInsightsChart = null;
      this.feedbackSentimentChart = null;
      this.lowPerformanceChart = null;
      return;
    }

    this.auditorStatusChart?.destroy();
    this.auditorTrendChart?.destroy();
    this.zonePerformanceChart?.destroy();
    this.zoneInsightsChart?.destroy();
    this.auditorStatusChart = null;
    this.auditorTrendChart = null;
    this.zonePerformanceChart = null;
    this.zoneInsightsChart = null;
  }
}
