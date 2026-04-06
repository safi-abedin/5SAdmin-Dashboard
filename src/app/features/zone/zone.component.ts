import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CreateZoneDto, UpdateZoneDto, ZoneDto } from '../../core/models/zone.model';
import { ToastService } from '../../core/services/toast.service';
import { ZoneService } from '../../core/services/zone.service';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

@Component({
  selector: 'app-zone',
  imports: [ReactiveFormsModule, TableComponent],
  templateUrl: './zone.component.html',
  styleUrl: './zone.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneComponent {
  private readonly zoneService = inject(ZoneService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn[] = [
    { field: 'name', header: 'Zone Name', sortable: true }
  ];

  private readonly zones = signal<ZoneDto[]>([]);
  protected readonly isTableLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);

  protected readonly selectedZone = signal<ZoneDto | null>(null);
  protected readonly editingZoneId = signal<number | null>(null);

  protected readonly rows = computed<TableRow[]>(() =>
    this.zones().map((zone) => ({
      id: zone.id,
      name: zone.name
    }))
  );

  protected readonly formTitle = computed(() => this.editingZoneId() ? 'Update Zone' : 'Create Zone');

  protected readonly zoneForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
    this.loadZones();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadZones();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadZones();
  }

  protected saveZone(): void {
    if (this.zoneForm.invalid || this.isSaving()) {
      this.zoneForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload: CreateZoneDto = this.zoneForm.getRawValue();
    const editingId = this.editingZoneId();

    if (editingId) {
      const updatePayload: UpdateZoneDto = {
        id: editingId,
        ...payload
      };

      this.zoneService
        .update(updatePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toastService.success('Zone updated successfully.');
            this.resetForm();
            this.loadZones();
          },
          error: () => {
            this.toastService.error('Unable to update zone.');
          }
        });

      return;
    }

    this.zoneService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Zone created successfully.');
          this.resetForm();
          this.currentPage.set(1);
          this.loadZones();
        },
        error: () => {
          this.toastService.error('Unable to create zone.');
        }
      });
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid zone selection.');
      return;
    }

    this.zoneService.getById(id).subscribe({
      next: (zone) => {
        this.selectedZone.set(zone);
        this.toastService.info(`Viewing zone: ${zone.name}`);
      },
      error: () => {
        this.toastService.error('Unable to load zone details.');
      }
    });
  }

  protected onEdit(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid zone selection.');
      return;
    }

    this.zoneService.getById(id).subscribe({
      next: (zone) => {
        this.editingZoneId.set(zone.id);
        this.selectedZone.set(zone);
        this.zoneForm.setValue({
          name: zone.name
        });
      },
      error: () => {
        this.toastService.error('Unable to load zone for editing.');
      }
    });
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid zone selection.');
      return;
    }

    this.zoneService.delete(id).subscribe({
      next: () => {
        this.toastService.success('Zone deleted successfully.');
        if (this.editingZoneId() === id) {
          this.resetForm();
        }
        this.loadZones();
      },
      error: () => {
        this.toastService.error('Unable to delete zone.');
      }
    });
  }

  protected resetForm(): void {
    this.editingZoneId.set(null);
    this.selectedZone.set(null);
    this.zoneForm.reset({
      name: ''
    });
  }

  private loadZones(): void {
    this.isTableLoading.set(true);

    this.zoneService
      .getAll({ page: this.currentPage(), size: this.pageSize() })
      .pipe(finalize(() => this.isTableLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.zones.set(response.data ?? []);
          this.totalItems.set(response.totalCount ?? 0);
          this.currentPage.set(response.page || this.currentPage());
          this.pageSize.set(response.size || this.pageSize());
        },
        error: () => {
          this.zones.set([]);
          this.totalItems.set(0);
          this.toastService.error('Unable to load zones.');
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
