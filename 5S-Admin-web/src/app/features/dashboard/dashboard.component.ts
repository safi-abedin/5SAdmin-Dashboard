import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Role } from '../../core/models/role.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-dashboard',
  imports: [TableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly role = computed(() => this.authService.getRole() ?? Role.ADMIN);

  protected readonly columns: TableColumn[] = [
    { field: 'auditId', header: 'Audit ID', sortable: true, width: '120px' },
    { field: 'lineName', header: 'Line', sortable: true },
    { field: 'auditor', header: 'Auditor', sortable: true },
    { field: 'score', header: 'Score', sortable: true, align: 'center', width: '90px' },
    { field: 'status', header: 'Status', sortable: true, width: '120px' }
  ];

  private readonly allRows = signal<TableRow[]>([
    { id: 1, auditId: 'AUD-1001', lineName: 'Cutting', auditor: 'Rahim', score: 92, status: 'Passed' },
    { id: 2, auditId: 'AUD-1002', lineName: 'Sewing A', auditor: 'Nusrat', score: 88, status: 'Passed' },
    { id: 3, auditId: 'AUD-1003', lineName: 'Sewing B', auditor: 'Tanvir', score: 74, status: 'Review' },
    { id: 4, auditId: 'AUD-1004', lineName: 'Finishing', auditor: 'Mina', score: 95, status: 'Passed' },
    { id: 5, auditId: 'AUD-1005', lineName: 'Packing', auditor: 'Jamal', score: 68, status: 'Action' },
    { id: 6, auditId: 'AUD-1006', lineName: 'Stores', auditor: 'Adiba', score: 81, status: 'Review' },
    { id: 7, auditId: 'AUD-1007', lineName: 'Warehouse', auditor: 'Fardin', score: 89, status: 'Passed' },
    { id: 8, auditId: 'AUD-1008', lineName: 'Cutting', auditor: 'Sadiya', score: 77, status: 'Review' },
    { id: 9, auditId: 'AUD-1009', lineName: 'Sewing C', auditor: 'Arif', score: 84, status: 'Passed' },
    { id: 10, auditId: 'AUD-1010', lineName: 'Packing', auditor: 'Moumita', score: 72, status: 'Action' },
    { id: 11, auditId: 'AUD-1011', lineName: 'Finishing', auditor: 'Rafi', score: 90, status: 'Passed' },
    { id: 12, auditId: 'AUD-1012', lineName: 'Stores', auditor: 'Lina', score: 79, status: 'Review' }
  ]);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly isLoading = signal(false);

  protected readonly totalItems = computed(() => this.allRows().length);
  protected readonly pagedRows = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.allRows().slice(start, start + size);
  });

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected onSearch(term: string): void {
    this.toastService.info(`Search requested: ${term || 'all records'}`);
  }

  protected onSort(): void {
    this.toastService.info('Sort event emitted to parent for API-side sorting.');
  }

  protected onView(row: TableRow): void {
    this.toastService.info(`Viewing ${String(row['auditId'] ?? 'record')}`);
  }

  protected onEdit(row: TableRow): void {
    this.toastService.warning(`Editing ${String(row['auditId'] ?? 'record')}`);
  }

  protected onDelete(row: TableRow): void {
    this.toastService.error(`Delete requested for ${String(row['auditId'] ?? 'record')}`);
  }
}
