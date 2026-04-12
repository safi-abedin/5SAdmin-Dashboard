import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuditResponseDto, AuditStatus } from '../../core/models/audit-record.model';
import { CompanyDto } from '../../core/models/company.model';
import { Role } from '../../core/models/role.model';
import { UserDto } from '../../core/models/user-management.model';
import { ZoneDto } from '../../core/models/zone.model';
import { AuditRecordService } from '../../core/services/audit-record.service';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { ZoneService } from '../../core/services/zone.service';
import { FullscreenModalComponent } from '../../shared/components/fullscreen-modal/fullscreen-modal.component';
import { ImageViewerComponent } from '../../shared/components/image-viewer/image-viewer.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

interface AuditCategoryTab {
  categoryId: number;
  categoryName: string;
  categoryOrder: number;
  items: AuditResponseDto['items'];
}

@Component({
  selector: 'app-audit',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    TableComponent,
    FullscreenModalComponent,
    ImageViewerComponent
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditComponent {
    protected readonly columns: TableColumn[] = [
      { field: 'auditDate', header: 'Audit Date', sortable: true },
      { field: 'auditorName', header: 'Auditor', sortable: true },
      { field: 'zoneName', header: 'Zone', sortable: true },
      { field: 'department', header: 'Department', sortable: true },
      { field: 'percentage', header: 'Score %', sortable: true, align: 'end', width: '110px' },
      {
        field: 'statusLabel',
        header: 'Status',
        sortable: true,
        toneMap: {
          draft: 'tone-warning',
          submitted: 'tone-info',
          reviewed: 'tone-success'
        }
      },
      { field: 'createdAt', header: 'Created', sortable: true }
    ];

  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserManagementService);
  private readonly zoneService = inject(ZoneService);
  private readonly auditService = inject(AuditRecordService);
  private readonly toastService = inject(ToastService);

  protected readonly isSuperAdmin = computed(() => this.authService.getRole() === Role.SUPER_ADMIN);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly zones = signal<ZoneDto[]>([]);

  protected readonly rows = signal<AuditResponseDto[]>([]);
  protected readonly selectedAudit = signal<AuditResponseDto | null>(null);
  protected readonly selectedImage = signal<string | null>(null);
  protected readonly isDetailModalOpen = signal(false);
  protected readonly activeCategoryId = signal<number | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly isLoadingCompanies = signal(false);
  protected readonly isLoadingUsers = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  protected readonly sortBy = signal('CreatedAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected readonly pageSizes = [10, 20, 50];
  protected readonly statusOptions = ['Draft', 'Submitted', 'Reviewed'];

  protected readonly tableRows = computed<TableRow[]>(() =>
    this.rows().map((item) => ({
      id: item.id,
      auditDate: this.formatDate(item.auditDate),
      auditorName: item.auditorName,
      zoneName: item.zoneName || `Zone #${item.zoneId}`,
      department: item.department,
      percentage: `${item.percentage.toFixed(2)}%`,
      statusLabel: this.formatAuditStatus(item.status),
      createdAt: this.formatDate(item.createdAt)
    }))
  );

  protected readonly totalPages = computed(() => {
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(this.totalItems() / size));
  });

  protected readonly categoryTabs = computed<AuditCategoryTab[]>(() => {
    const audit = this.selectedAudit();
    if (!audit) {
      return [];
    }

    const grouped = new Map<number, AuditCategoryTab>();

    for (const line of audit.items ?? []) {
      const id = line.checklistCatagoryId ?? -1;
      const current = grouped.get(id);

      if (!current) {
        grouped.set(id, {
          categoryId: id,
          categoryName: line.catagoryName || `Category ${id}`,
          categoryOrder: line.catagoryOrder ?? Number.MAX_SAFE_INTEGER,
          items: [line]
        });
        continue;
      }

      current.items = [...current.items, line];
      if (!current.categoryName && line.catagoryName) {
        current.categoryName = line.catagoryName;
      }
      current.categoryOrder = Math.min(current.categoryOrder, line.catagoryOrder ?? Number.MAX_SAFE_INTEGER);
    }

    return [...grouped.values()]
      .map((tab) => ({
        ...tab,
        items: [...tab.items].sort(
          (left, right) =>
            (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
            left.checklistItemId - right.checklistItemId
        )
      }))
      .sort(
        (left, right) =>
          left.categoryOrder - right.categoryOrder || left.categoryName.localeCompare(right.categoryName)
      );
  });

  protected readonly activeCategoryItems = computed(() => {
    const tabs = this.categoryTabs();
    if (tabs.length === 0) {
      return [];
    }

    const selected = this.activeCategoryId();
    const found = tabs.find((tab) => tab.categoryId === selected);
    return (found ?? tabs[0]).items;
  });

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    companyId: this.authService.getCompanyId() ?? 0,
    zoneId: 0,
    userId: 0,
    status: '',
    minScore: '',
    maxScore: '',
    createdFrom: '',
    createdTo: '',
    auditDateFrom: '',
    auditDateTo: ''
  });

  constructor() {
    this.bootstrap();
  }

  protected onApplyFilters(): void {
    this.currentPage.set(1);
    this.loadAudits();
  }

  protected onResetFilters(): void {
    this.filterForm.reset({
      companyId: this.authService.getCompanyId() ?? 0,
      zoneId: 0,
      userId: 0,
      status: '',
      minScore: '',
      maxScore: '',
      createdFrom: '',
      createdTo: '',
      auditDateFrom: '',
      auditDateTo: ''
    });

    this.selectedAudit.set(null);
    this.currentPage.set(1);
    this.sortBy.set('CreatedAt');
    this.sortDirection.set('desc');

    const companyId = this.resolveSelectedCompanyId();
    if (companyId) {
      this.loadUsers(companyId);
    }

    this.loadAudits();
  }

  protected onCompanyChange(value: string): void {
    const parsed = Number(value);
    const companyId = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    this.filterForm.controls.companyId.setValue(companyId);
    this.filterForm.controls.userId.setValue(0);
    this.users.set([]);

    if (companyId > 0) {
      this.loadUsers(companyId);
    }

    this.currentPage.set(1);
    this.loadAudits();
  }

  protected onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages() || this.isLoading()) {
      return;
    }

    this.currentPage.set(page);
    this.loadAudits();
  }

  protected onPageSizeChange(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize.set(parsed);
    this.currentPage.set(1);
    this.loadAudits();
  }

  protected onSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('asc');
    }

    this.currentPage.set(1);
    this.loadAudits();
  }

  protected onTableSort(sort: { field: string; direction: 'asc' | 'desc' | '' }): void {
    if (!sort.field || !sort.direction) {
      return;
    }

    this.sortBy.set(this.mapSortField(sort.field));
    this.sortDirection.set(sort.direction);
    this.currentPage.set(1);
    this.loadAudits();
  }

  protected onViewDetails(id: number): void {
    this.auditService.getById(id).subscribe({
      next: (audit) => {
        this.selectedAudit.set(audit);
        this.activeCategoryId.set(this.firstCategoryIdFromAudit(audit));
        this.isDetailModalOpen.set(true);
      },
      error: () => {
        this.toastService.error('Unable to load audit details.');
      }
    });
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid audit selection.');
      return;
    }

    this.onViewDetails(id);
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid audit selection.');
      return;
    }

    this.auditService.delete(id).subscribe({
      next: () => {
        this.toastService.success('Audit deleted successfully.');
        this.loadAudits();
      },
      error: () => {
        this.toastService.error('Unable to delete audit.');
      }
    });
  }

  protected onPdf(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid audit selection.');
      return;
    }

    this.auditService.getPdf(id).subscribe({
      next: (pdfBlob) => {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank', 'noopener');

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `audit-${id}.pdf`;
        anchor.click();

        URL.revokeObjectURL(url);
      },
      error: () => {
        this.toastService.error('Unable to generate audit PDF.');
      }
    });
  }

  protected closeDetailsModal(): void {
    this.isDetailModalOpen.set(false);
    this.activeCategoryId.set(null);
  }

  protected openImageViewer(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
  }

  protected closeImageViewer(): void {
    this.selectedImage.set(null);
  }

  protected selectCategory(categoryId: number): void {
    this.activeCategoryId.set(categoryId);
  }

  protected feedbackImageUrls(item: AuditResponseDto): string[] {
    return (item.feedBackItems ?? []).flatMap((feedback) => feedback.imageUrls ?? []);
  }

  protected mapSortField(field: string): string {
    const fields: Record<string, string> = {
      auditDate: 'AuditDate',
      auditorName: 'AuditorName',
      zoneName: 'ZoneName',
      department: 'Department',
      percentage: 'Percentage',
      statusLabel: 'Status',
      createdAt: 'CreatedAt'
    };

    return fields[field] ?? 'CreatedAt';
  }

  protected formatAuditStatus(value: string | number): string {
    if (typeof value === 'number') {
      const statusMap: Record<number, string> = {
        [AuditStatus.Draft]: 'Draft',
        [AuditStatus.Submitted]: 'Submitted',
        [AuditStatus.Reviewed]: 'Reviewed'
      };

      return statusMap[value] ?? String(value);
    }

    return value;
  }

  private formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleDateString();
  }

  private getIdFromRow(row: TableRow): number | null {
    const raw = row['id'];
    if (typeof raw === 'number') {
      return raw;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private firstCategoryIdFromAudit(audit: AuditResponseDto): number | null {
    const firstItem = [...(audit.items ?? [])].sort(
      (left, right) =>
        (left.catagoryOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.catagoryOrder ?? Number.MAX_SAFE_INTEGER)
    )[0];

    return firstItem?.checklistCatagoryId ?? null;
  }

  private bootstrap(): void {
    this.loadZones();

    if (this.isSuperAdmin()) {
      this.loadCompanies();
      return;
    }

    const companyId = this.resolveSelectedCompanyId();
    if (companyId) {
      this.loadUsers(companyId);
      this.loadAudits();
    } else {
      this.errorMessage.set('Logged in admin is not mapped to a company.');
    }
  }

  private loadCompanies(): void {
    this.isLoadingCompanies.set(true);

    this.companyService
      .getAll({ page: 1, size: 500 })
      .pipe(finalize(() => this.isLoadingCompanies.set(false)))
      .subscribe({
        next: (response) => {
          const items = response.data ?? [];
          this.companies.set(items);

          const selected = this.resolveSelectedCompanyId();
          if (!selected && items.length > 0) {
            const firstId = items[0].id;
            this.filterForm.controls.companyId.setValue(firstId);
            this.loadUsers(firstId);
          } else if (selected) {
            this.loadUsers(selected);
          }

          this.loadAudits();
        },
        error: () => {
          this.toastService.error('Unable to load companies.');
        }
      });
  }

  private loadUsers(companyId: number): void {
    this.isLoadingUsers.set(true);

    this.userService
      .getAll({ page: 1, size: 500 })
      .pipe(finalize(() => this.isLoadingUsers.set(false)))
      .subscribe({
        next: (response) => {
          const users = (response.data ?? []).filter((user) => user.companyId === companyId);
          this.users.set(users);
        },
        error: () => {
          this.users.set([]);
          this.toastService.error('Unable to load users.');
        }
      });
  }

  private loadZones(): void {
    this.zoneService.getAll({ page: 1, size: 500 }).subscribe({
      next: (response) => {
        this.zones.set(response.data ?? []);
      },
      error: () => {
        this.zones.set([]);
      }
    });
  }

  private loadAudits(): void {
    const companyId = this.resolveSelectedCompanyId();
    if (!companyId) {
      this.rows.set([]);
      this.totalItems.set(0);
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const selectedUserId = Number(this.filterForm.controls.userId.value);
    const selectedUser = this.users().find((user) => user.id === selectedUserId);

    const minScoreValue = Number(this.filterForm.controls.minScore.value);
    const maxScoreValue = Number(this.filterForm.controls.maxScore.value);

    this.auditService
      .getAll({
        page: this.currentPage(),
        size: this.pageSize(),
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
        companyId,
        zoneId: this.parseNumberOrNull(this.filterForm.controls.zoneId.value),
        auditorName: selectedUser?.name ?? null,
        status: this.filterForm.controls.status.value || null,
        minScore: Number.isFinite(minScoreValue) && minScoreValue > 0 ? minScoreValue : null,
        maxScore: Number.isFinite(maxScoreValue) && maxScoreValue > 0 ? maxScoreValue : null,
        createdFrom: this.filterForm.controls.createdFrom.value || null,
        createdTo: this.filterForm.controls.createdTo.value || null,
        auditDateFrom: this.filterForm.controls.auditDateFrom.value || null,
        auditDateTo: this.filterForm.controls.auditDateTo.value || null
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.rows.set(response.data ?? []);
          this.totalItems.set(response.totalCount ?? 0);
          this.currentPage.set(response.page || this.currentPage());
          this.pageSize.set(response.size || this.pageSize());
        },
        error: () => {
          this.rows.set([]);
          this.totalItems.set(0);
          this.errorMessage.set('Unable to load audits with selected filters.');
        }
      });
  }

  private resolveSelectedCompanyId(): number | null {
    if (this.isSuperAdmin()) {
      const raw = Number(this.filterForm.controls.companyId.value);
      return Number.isFinite(raw) && raw > 0 ? raw : null;
    }

    return this.authService.getCompanyId();
  }

  private parseNumberOrNull(value: string | number): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
