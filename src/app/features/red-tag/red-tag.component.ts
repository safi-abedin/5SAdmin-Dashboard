import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CompanyDto } from '../../core/models/company.model';
import {
  CreateRedTagDto,
  RedTagResponseDto,
  RedTagStatus,
  UpdateRedTagDto
} from '../../core/models/red-tag.model';
import { Role } from '../../core/models/role.model';
import { UserDto } from '../../core/models/user-management.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { RedTagService } from '../../core/services/red-tag.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { FullscreenModalComponent } from '../../shared/components/fullscreen-modal/fullscreen-modal.component';
import { ImageViewerComponent } from '../../shared/components/image-viewer/image-viewer.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-red-tag',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    TableComponent,
    FullscreenModalComponent,
    ImageViewerComponent
  ],
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

  protected readonly columns: TableColumn[] = [
    { field: 'itemName', header: 'Item', sortable: true },
    { field: 'responsiblePerson', header: 'Responsible', sortable: true },
    {
      field: 'statusLabel',
      header: 'Status',
      sortable: true,
      toneMap: {
        open: 'tone-danger',
        'in progress': 'tone-warning',
        inprogress: 'tone-warning',
        closed: 'tone-success'
      }
    },
    { field: 'identifiedDate', header: 'Identified', sortable: true },
    { field: 'closingDate', header: 'Closed', sortable: true },
    { field: 'createdAt', header: 'Created', sortable: true }
  ];

  protected readonly isSuperAdmin = computed(() => this.authService.getRole() === Role.SUPER_ADMIN);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);

  protected readonly rows = signal<RedTagResponseDto[]>([]);
  protected readonly selectedRedTag = signal<RedTagResponseDto | null>(null);
  protected readonly modalMode = signal<'create' | 'edit' | 'view' | null>(null);
  protected readonly selectedPhotos = signal<File[]>([]);
  protected readonly selectedPhotoPreviews = signal<string[]>([]);
  protected readonly selectedImage = signal<string | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isLoadingCompanies = signal(false);
  protected readonly isLoadingUsers = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  protected readonly sortBy = signal('CreatedAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected readonly pageSizes = [10, 20, 50];
  protected readonly statusOptions = [
    { label: 'Open', value: RedTagStatus.Open },
    { label: 'In Progress', value: RedTagStatus.InProgress },
    { label: 'Closed', value: RedTagStatus.Closed }
  ];

  protected readonly isModalOpen = computed(() => this.modalMode() !== null);

  protected readonly tableRows = computed<TableRow[]>(() =>
    this.rows().map((item) => ({
      id: item.id,
      itemName: item.itemName,
      responsiblePerson: item.responsiblePerson,
      statusLabel: this.formatStatus(item.status),
      identifiedDate: this.formatDate(item.identifiedDate),
      closingDate: item.closingDate ? this.formatDate(item.closingDate) : '-',
      createdAt: this.formatDate(item.createdAt)
    }))
  );

  protected readonly redTagForm = this.formBuilder.nonNullable.group({
    itemName: '',
    description: '',
    quantity: 1,
    location: '',
    responsiblePerson: '',
    status: RedTagStatus.Open,
    identifiedDate: '',
    closingDate: ''
  });

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

  protected onPageSizeChange(value: string | number): void {
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

  protected onTableSort(sort: { field: string; direction: 'asc' | 'desc' | '' }): void {
    if (!sort.field || !sort.direction) {
      return;
    }

    this.sortBy.set(this.mapSortField(sort.field));
    this.sortDirection.set(sort.direction);
    this.currentPage.set(1);
    this.loadRedTags();
  }

  protected onViewDetails(id: number): void {
    this.redTagService.getById(id).subscribe({
      next: (item) => {
        this.selectedRedTag.set(item);
        this.modalMode.set('view');
      },
      error: () => {
        this.toastService.error('Unable to load red tag details.');
      }
    });
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.clearPhotoPreviews();
    this.selectedPhotos.set([]);
    this.redTagForm.reset({
      itemName: '',
      description: '',
      quantity: 1,
      location: '',
      responsiblePerson: '',
      status: RedTagStatus.Open,
      identifiedDate: '',
      closingDate: ''
    });
  }

  protected openCreateModal(): void {
    this.selectedRedTag.set(null);
    this.closeModal();
    this.modalMode.set('create');
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid red tag selection.');
      return;
    }

    this.onViewDetails(id);
  }

  protected onEdit(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid red tag selection.');
      return;
    }

    this.redTagService.getById(id).subscribe({
      next: (item) => {
        this.selectedRedTag.set(item);
        this.selectedPhotos.set([]);
        this.redTagForm.reset({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          location: item.location,
          responsiblePerson: item.responsiblePerson,
          status: this.parseStatus(item.status),
          identifiedDate: item.identifiedDate ? item.identifiedDate.slice(0, 10) : '',
          closingDate: item.closingDate ? item.closingDate.slice(0, 10) : ''
        });
        this.modalMode.set('edit');
      },
      error: () => {
        this.toastService.error('Unable to load red tag details for editing.');
      }
    });
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid red tag selection.');
      return;
    }

    this.redTagService.delete(id).subscribe({
      next: () => {
        this.toastService.success('Red tag deleted successfully.');
        this.loadRedTags();
      },
      error: () => {
        this.toastService.error('Unable to delete red tag.');
      }
    });
  }

  protected onFileChange(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files) {
      this.clearPhotoPreviews();
      this.selectedPhotos.set([]);
      return;
    }

    const files = Array.from(input.files);
    this.clearPhotoPreviews();
    this.selectedPhotos.set(files);
    this.selectedPhotoPreviews.set(files.map((file) => URL.createObjectURL(file)));
  }

  protected openImageViewer(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
  }

  protected closeImageViewer(): void {
    this.selectedImage.set(null);
  }

  protected saveRedTag(): void {
    if (this.redTagForm.invalid || this.isSaving()) {
      this.redTagForm.markAllAsTouched();
      return;
    }

    const value = this.redTagForm.getRawValue();
    const payload: CreateRedTagDto = {
      itemName: value.itemName,
      description: value.description,
      quantity: value.quantity,
      location: value.location,
      photos: this.selectedPhotos(),
      responsiblePerson: value.responsiblePerson,
      status: Number(value.status),
      identifiedDate: value.identifiedDate || null,
      closingDate: value.closingDate || null
    };

    this.isSaving.set(true);

    if (this.modalMode() === 'edit' && this.selectedRedTag()) {
      const updatePayload: UpdateRedTagDto = {
        ...payload,
        id: this.selectedRedTag()!.id
      };

      this.redTagService
        .update(updatePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toastService.success('Red tag updated successfully.');
            this.closeModal();
            this.loadRedTags();
          },
          error: () => {
            this.toastService.error('Unable to update red tag.');
          }
        });

      return;
    }

    this.redTagService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Red tag created successfully.');
          this.closeModal();
          this.currentPage.set(1);
          this.loadRedTags();
        },
        error: () => {
          this.toastService.error('Unable to create red tag.');
        }
      });
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

  private formatStatus(value: string | number): string {
    if (typeof value === 'number') {
      const statusMap: Record<number, string> = {
        [RedTagStatus.Open]: 'Open',
        [RedTagStatus.InProgress]: 'In Progress',
        [RedTagStatus.Closed]: 'Closed'
      };

      return statusMap[value] ?? String(value);
    }

    return value;
  }

  private parseStatus(value: string | number): RedTagStatus {
    if (typeof value === 'number') {
      return value as RedTagStatus;
    }

    const normalized = value.toLowerCase();
    if (normalized === 'closed') {
      return RedTagStatus.Closed;
    }
    if (normalized === 'inprogress' || normalized === 'in progress') {
      return RedTagStatus.InProgress;
    }

    return RedTagStatus.Open;
  }

  private formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleDateString();
  }

  private mapSortField(field: string): string {
    const fields: Record<string, string> = {
      itemName: 'ItemName',
      responsiblePerson: 'ResponsiblePerson',
      statusLabel: 'Status',
      identifiedDate: 'IdentifiedDate',
      closingDate: 'ClosingDate',
      createdAt: 'CreatedAt'
    };

    return fields[field] ?? 'CreatedAt';
  }

  private getIdFromRow(row: TableRow): number | null {
    const raw = row['id'];
    if (typeof raw === 'number') {
      return raw;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private clearPhotoPreviews(): void {
    for (const url of this.selectedPhotoPreviews()) {
      URL.revokeObjectURL(url);
    }
    this.selectedPhotoPreviews.set([]);
  }
}
