import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CompanyDto } from '../../core/models/company.model';
import { Role } from '../../core/models/role.model';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserRoleOption
} from '../../core/models/user-management.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { FullscreenModalComponent } from '../../shared/components/fullscreen-modal/fullscreen-modal.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-user-management',
  imports: [ReactiveFormsModule, TableComponent, FullscreenModalComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent {
  private readonly userService = inject(UserManagementService);
  private readonly authService = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'username', header: 'Username', sortable: true },
    { field: 'role', header: 'Role', sortable: true, width: '130px' },
    { field: 'companyName', header: 'Company', sortable: true }
  ];

  private readonly users = signal<UserDto[]>([]);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly isTableLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  protected readonly selectedUser = signal<UserDto | null>(null);
  protected readonly editingUserId = signal<number | null>(null);
  protected readonly modalMode = signal<'create' | 'edit' | 'view' | null>(null);

  protected readonly isModalOpen = computed(() => this.modalMode() !== null);

  protected readonly loggedInRole = computed(() => this.authService.getRole());
  protected readonly loggedInCompanyId = computed(() => this.authService.getCompanyId());

  protected readonly roleOptions = computed<UserRoleOption[]>(() => {
    if (this.loggedInRole() === Role.SUPER_ADMIN) {
      return [
        { value: 'auditor', label: 'Auditor' },
        { value: 'admin', label: 'Admin' }
      ];
    }

    return [{ value: 'auditor', label: 'Auditor' }];
  });

  protected readonly rows = computed<TableRow[]>(() =>
    this.users().map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      companyName: user.companyName ?? '-'
    }))
  );

  protected readonly formTitle = computed(() =>
    this.editingUserId() ? 'Update User' : 'Create User'
  );

  protected readonly userForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
      ]
    }),
    role: new FormControl('auditor', { nonNullable: true, validators: [Validators.required] }),
    companyId: new FormControl<number | null>(null)
  });

  constructor() {
    this.loadCompaniesForSuperAdmin();
    this.initializeFormByRole();
    this.loadUsers();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadUsers();
  }

  protected saveUser(): void {
    if (this.userForm.invalid || this.isSaving()) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSaving.set(true);
    const editingId = this.editingUserId();

    if (editingId) {
      const updatePayload: UpdateUserDto = {
        id: editingId,
        ...payload
      };

      this.userService
        .update(updatePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toastService.success('User updated successfully.');
            this.closeModal();
            this.loadUsers();
          },
          error: () => {
            this.toastService.error('Unable to update user.');
          }
        });

      return;
    }

    this.userService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('User created successfully.');
          this.closeModal();
          this.currentPage.set(1);
          this.loadUsers();
        },
        error: () => {
          this.toastService.error('Unable to create user.');
        }
      });
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid user selection.');
      return;
    }

    this.userService.getById(id).subscribe({
      next: (user) => {
        this.selectedUser.set(user);
        this.modalMode.set('view');
      },
      error: () => {
        this.toastService.error('Unable to load user details.');
      }
    });
  }

  protected onEdit(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid user selection.');
      return;
    }

    this.userService.getById(id).subscribe({
      next: (user) => {
        this.editingUserId.set(user.id);
        this.selectedUser.set(user);
        this.modalMode.set('edit');

        const normalizedRole = this.normalizeRole(user.role);
        const role = this.roleOptions().some((option) => option.value === normalizedRole)
          ? normalizedRole
          : 'auditor';

        this.userForm.setValue({
          name: user.name,
          username: user.username,
          password: '',
          role,
          companyId: this.resolveEditableCompanyId(user.companyId)
        });
      },
      error: () => {
        this.toastService.error('Unable to load user for editing.');
      }
    });
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid user selection.');
      return;
    }

    this.userService.delete(id).subscribe({
      next: () => {
        this.toastService.success('User deleted successfully.');
        if (this.editingUserId() === id) {
          this.resetForm();
        }
        this.loadUsers();
      },
      error: () => {
        this.toastService.error('Unable to delete user.');
      }
    });
  }

  protected resetForm(): void {
    this.editingUserId.set(null);
    this.selectedUser.set(null);

    const isCompanyAdmin = this.loggedInRole() === Role.ADMIN;
    const companyId = isCompanyAdmin ? this.loggedInCompanyId() : null;

    this.userForm.reset({
      name: '',
      username: '',
      password: '',
      role: 'auditor',
      companyId
    });

    if (isCompanyAdmin) {
      this.userForm.controls.companyId.disable({ emitEvent: false });
    } else {
      this.userForm.controls.companyId.enable({ emitEvent: false });
    }
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.modalMode.set('create');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.resetForm();
  }

  protected generatePassword(length = 12): void {
    const safeLength = Math.max(10, Math.min(length, 32));
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const allChars = `${upper}${lower}${digits}${special}`;

    const requiredChars = [
      this.pickRandom(upper),
      this.pickRandom(lower),
      this.pickRandom(digits),
      this.pickRandom(special)
    ];

    const remainingLength = safeLength - requiredChars.length;
    const randomChars: string[] = [];

    for (let index = 0; index < remainingLength; index += 1) {
      randomChars.push(this.pickRandom(allChars));
    }

    const passwordChars = [...requiredChars, ...randomChars];
    this.shuffleInPlace(passwordChars);
    const password = passwordChars.join('');

    this.userForm.controls.password.setValue(password);
    this.userForm.controls.password.markAsDirty();
    this.userForm.controls.password.markAsTouched();
    this.toastService.info('A secure password has been generated.');
  }

  protected isCompanyAdmin(): boolean {
    return this.loggedInRole() === Role.ADMIN;
  }

  private initializeFormByRole(): void {
    this.resetForm();
  }

  private loadCompaniesForSuperAdmin(): void {
    if (this.loggedInRole() !== Role.SUPER_ADMIN) {
      this.companies.set([]);
      return;
    }

    this.companyService.getAll({ page: 1, size: 500 }).subscribe({
      next: (response) => {
        this.companies.set(response.data ?? []);
      },
      error: () => {
        this.toastService.error('Unable to load companies for user assignment.');
      }
    });
  }

  private loadUsers(): void {
    this.isTableLoading.set(true);

    this.userService
      .getAll({ page: this.currentPage(), size: this.pageSize() })
      .pipe(finalize(() => this.isTableLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.data ?? []);
          this.totalItems.set(response.totalCount ?? 0);
          this.currentPage.set(response.page || this.currentPage());
          this.pageSize.set(response.size || this.pageSize());
        },
        error: () => {
          this.users.set([]);
          this.totalItems.set(0);
          this.toastService.error('Unable to load users.');
        }
      });
  }

  private buildPayload(): CreateUserDto | null {
    const value = this.userForm.getRawValue();
    const role = this.normalizeRole(value.role);

    if (!this.roleOptions().some((option) => option.value === role)) {
      this.toastService.error('Selected role is not allowed for your account.');
      return null;
    }

    const companyId = this.isCompanyAdmin()
      ? this.loggedInCompanyId()
      : this.normalizeCompanyId(value.companyId);

    if (!this.isCompanyAdmin() && companyId === null) {
      this.toastService.error('Please select a company.');
      return null;
    }

    return {
      name: value.name.trim(),
      username: value.username.trim(),
      password: value.password,
      role,
      companyId
    };
  }

  private normalizeRole(role: string): string {
    return role.trim().toLowerCase();
  }

  private normalizeCompanyId(value: number | null): number | null {
    if (typeof value !== 'number') {
      return null;
    }

    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private resolveEditableCompanyId(value: number | null): number | null {
    if (this.isCompanyAdmin()) {
      return this.loggedInCompanyId();
    }

    return value;
  }

  private getIdFromRow(row: TableRow): number | null {
    const raw = row['id'];
    if (typeof raw === 'number') {
      return raw;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private pickRandom(charset: string): string {
    const index = this.getSecureRandomInt(charset.length);
    return charset[index];
  }

  private shuffleInPlace(values: string[]): void {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = this.getSecureRandomInt(index + 1);
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
  }

  private getSecureRandomInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      return 0;
    }

    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] % maxExclusive;
  }
}
