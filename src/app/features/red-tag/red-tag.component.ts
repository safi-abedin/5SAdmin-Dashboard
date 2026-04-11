import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CompanyDto } from '../../core/models/company.model';
import { RedTagResponseDto } from '../../core/models/red-tag.model';
import { Role } from '../../core/models/role.model';
import { UserDto } from '../../core/models/user-management.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { RedTagService } from '../../core/services/red-tag.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../../core/services/user-management.service';

@Component({
  selector: 'app-red-tag',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './red-tag.component.html',
  styleUrl: './red-tag.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RedTagComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserManagementService);
  private readonly redTagService = inject(RedTagService);
  private readonly toastService = inject(ToastService);

  protected readonly isSuperAdmin = computed(() => this.authService.getRole() === Role.SUPER_ADMIN);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);

  protected readonly rows = signal<RedTagResponseDto[]>([]);
  protected readonly selectedRedTag = signal<RedTagResponseDto | null>(null);
  protected readonly isDetailModalOpen = signal(false);

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
  protected readonly statusOptions = ['Open', 'InProgress', 'Closed'];

  protected readonly totalPages = computed(() => {
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(this.totalItems() / size));
  });

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    companyId: this.authService.getCompanyId() ?? 0,
    userId: 0,
    status: '',
    createdFrom: '',
    createdTo: '',
    identifiedDateFrom: '',
    identifiedDateTo: '',
    closingDateFrom: '',
    closingDateTo: ''
  });

  constructor() {
    this.bootstrap();
  }

  protected onApplyFilters(): void {
    this.currentPage.set(1);
    this.loadRedTags();
  }

  protected onResetFilters(): void {
    this.filterForm.reset({
      companyId: this.authService.getCompanyId() ?? 0,
      userId: 0,
      status: '',
      createdFrom: '',
      createdTo: '',
      identifiedDateFrom: '',
      identifiedDateTo: '',
      closingDateFrom: '',
      closingDateTo: ''
    });

    this.selectedRedTag.set(null);
    this.currentPage.set(1);
    this.sortBy.set('CreatedAt');
    this.sortDirection.set('desc');

    const companyId = this.resolveSelectedCompanyId();
    if (companyId) {
      this.loadUsers(companyId);
    }

    this.loadRedTags();
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
    this.loadRedTags();
  }

  protected onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages() || this.isLoading()) {
      return;
    }

    this.currentPage.set(page);
    this.loadRedTags();
  }

  protected onPageSizeChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize.set(parsed);
    this.currentPage.set(1);
    this.loadRedTags();
  }

  protected onSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('asc');
    }

    this.currentPage.set(1);
    this.loadRedTags();
  }

  protected onViewDetails(id: number): void {
    this.redTagService.getById(id).subscribe({
      next: (item) => {
        this.selectedRedTag.set(item);
        this.isDetailModalOpen.set(true);
      },
      error: () => {
        this.toastService.error('Unable to load red tag details.');
      }
    });
  }

  protected closeDetailsModal(): void {
    this.isDetailModalOpen.set(false);
  }

  private bootstrap(): void {
    if (this.isSuperAdmin()) {
      this.loadCompanies();
      return;
    }

    const companyId = this.resolveSelectedCompanyId();
    if (companyId) {
      this.loadUsers(companyId);
      this.loadRedTags();
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

          this.loadRedTags();
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
          this.users.set((response.data ?? []).filter((user) => user.companyId === companyId));
        },
        error: () => {
          this.users.set([]);
          this.toastService.error('Unable to load users.');
        }
      });
  }

  private loadRedTags(): void {
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

    this.redTagService
      .getAll({
        page: this.currentPage(),
        size: this.pageSize(),
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
        companyId,
        responsiblePerson: selectedUser?.name ?? null,
        status: this.filterForm.controls.status.value || null,
        createdFrom: this.filterForm.controls.createdFrom.value || null,
        createdTo: this.filterForm.controls.createdTo.value || null,
        identifiedDateFrom: this.filterForm.controls.identifiedDateFrom.value || null,
        identifiedDateTo: this.filterForm.controls.identifiedDateTo.value || null,
        closingDateFrom: this.filterForm.controls.closingDateFrom.value || null,
        closingDateTo: this.filterForm.controls.closingDateTo.value || null
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
          this.errorMessage.set('Unable to load red tags with selected filters.');
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
}
