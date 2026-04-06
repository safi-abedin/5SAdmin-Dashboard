import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CompanyDto, CreateCompanyDto, UpdateCompanyDto } from '../../core/models/company.model';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-company',
  imports: [ReactiveFormsModule, TableComponent],
  templateUrl: './company.component.html',
  styleUrl: './company.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyComponent {
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn[] = [
    { field: 'companyName', header: 'Company Name', sortable: true },
    { field: 'companyCode', header: 'Company Code', sortable: true, width: '140px' },
    { field: 'contactPerson', header: 'Contact Person', sortable: true },
    { field: 'email', header: 'Email', sortable: true },
    { field: 'phone', header: 'Phone', sortable: true, width: '130px' }
  ];

  private readonly companies = signal<CompanyDto[]>([]);
  protected readonly isTableLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  protected readonly selectedCompany = signal<CompanyDto | null>(null);
  protected readonly editingCompanyId = signal<number | null>(null);

  protected readonly rows = computed<TableRow[]>(() =>
    this.companies().map((company) => ({
      id: company.id,
      companyName: company.companyName,
      companyCode: company.companyCode,
      contactPerson: company.contactPerson,
      email: company.email,
      phone: company.phone
    }))
  );

  protected readonly formTitle = computed(() =>
    this.editingCompanyId() ? 'Update Company' : 'Create Company'
  );

  protected readonly companyForm = new FormGroup({
    companyName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    companyCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactPerson: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
    this.loadCompanies();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCompanies();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadCompanies();
  }

  protected saveCompany(): void {
    if (this.companyForm.invalid || this.isSaving()) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const payload: CreateCompanyDto = this.companyForm.getRawValue();
    const editingId = this.editingCompanyId();

    if (editingId) {
      const updatePayload: UpdateCompanyDto = {
        id: editingId,
        ...payload
      };

      this.companyService
        .update(updatePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toastService.success('Company updated successfully.');
            this.resetForm();
            this.loadCompanies();
          },
          error: () => {
            this.toastService.error('Unable to update company.');
          }
        });

      return;
    }

    this.companyService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Company created successfully.');
          this.resetForm();
          this.currentPage.set(1);
          this.loadCompanies();
        },
        error: () => {
          this.toastService.error('Unable to create company.');
        }
      });
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid company selection.');
      return;
    }

    this.companyService.getById(id).subscribe({
      next: (company) => {
        this.selectedCompany.set(company);
        this.toastService.info(`Viewing company: ${company.companyName}`);
      },
      error: () => {
        this.toastService.error('Unable to load company details.');
      }
    });
  }

  protected onEdit(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid company selection.');
      return;
    }

    this.companyService.getById(id).subscribe({
      next: (company) => {
        this.editingCompanyId.set(company.id);
        this.selectedCompany.set(company);
        this.companyForm.setValue({
          companyName: company.companyName,
          companyCode: company.companyCode,
          contactPerson: company.contactPerson,
          email: company.email,
          phone: company.phone
        });
      },
      error: () => {
        this.toastService.error('Unable to load company for editing.');
      }
    });
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid company selection.');
      return;
    }

    this.companyService.delete(id).subscribe({
      next: () => {
        this.toastService.success('Company deleted successfully.');
        if (this.editingCompanyId() === id) {
          this.resetForm();
        }
        this.loadCompanies();
      },
      error: () => {
        this.toastService.error('Unable to delete company.');
      }
    });
  }

  protected resetForm(): void {
    this.editingCompanyId.set(null);
    this.selectedCompany.set(null);
    this.companyForm.reset({
      companyName: '',
      companyCode: '',
      contactPerson: '',
      email: '',
      phone: ''
    });
  }

  private loadCompanies(): void {
    this.isTableLoading.set(true);

    this.companyService
      .getAll({ page: this.currentPage(), size: this.pageSize() })
      .pipe(finalize(() => this.isTableLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.companies.set(response.data ?? []);
          this.totalItems.set(response.totalCount ?? 0);
          this.currentPage.set(response.page || this.currentPage());
          this.pageSize.set(response.size || this.pageSize());
        },
        error: () => {
          this.companies.set([]);
          this.totalItems.set(0);
          this.toastService.error('Unable to load companies.');
        }
      });
  }

  private getIdFromRow(row: TableRow): number | null {
    const raw = row['id'];
    if (typeof raw === 'number') {
      return raw;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
