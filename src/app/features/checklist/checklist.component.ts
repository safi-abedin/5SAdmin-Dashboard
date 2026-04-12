import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ChecklistCategoryDto } from '../../core/models/checklist-category.model';
import {
  ChecklistDto,
  CreateChecklistDto,
  UpdateChecklistDto
} from '../../core/models/checklist.model';
import { ChecklistCategoryService } from '../../core/services/checklist-category.service';
import { ChecklistService } from '../../core/services/checklist.service';
import { ToastService } from '../../core/services/toast.service';
import { FullscreenModalComponent } from '../../shared/components/fullscreen-modal/fullscreen-modal.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { TableColumn, TableRow } from '../../shared/components/table/table.model';

interface ChecklistGroup {
  categoryId: number;
  categoryName: string;
  items: ChecklistDto[];
}

@Component({
  selector: 'app-checklist',
  imports: [ReactiveFormsModule, TableComponent, FullscreenModalComponent],
  templateUrl: './checklist.component.html',
  styleUrl: './checklist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistComponent {
  private readonly checklistService = inject(ChecklistService);
  private readonly categoryService = inject(ChecklistCategoryService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn[] = [
    { field: 'categoryName', header: 'Category', sortable: true },
    { field: 'order', header: 'Order', sortable: true, width: '90px', align: 'center' },
    { field: 'checkingItemName', header: 'Checking Item', sortable: true },
    { field: 'evaluationCriteria', header: 'Evaluation Criteria' },
    { field: 'maxScore', header: 'Max Score', sortable: true, width: '110px', align: 'center' }
  ];

  private readonly checklists = signal<ChecklistDto[]>([]);
  protected readonly categories = signal<ChecklistCategoryDto[]>([]);
  protected readonly isTableLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly selectedChecklist = signal<ChecklistDto | null>(null);
  protected readonly editingChecklistId = signal<number | null>(null);
  protected readonly modalMode = signal<'create' | 'edit' | 'view' | null>(null);
  protected readonly activeCategoryId = signal<number | null>(null);

  protected readonly isModalOpen = computed(() => this.modalMode() !== null);

  protected readonly rows = computed<TableRow[]>(() =>
    this.checklists().map((item) => ({
      id: item.id,
      categoryName: item.categoryName || this.resolveCategoryName(item.categoryId),
      order: item.order,
      checkingItemName: item.checkingItemName,
      evaluationCriteria: item.evaluationCriteria,
      maxScore: item.maxScore
    }))
  );

  protected readonly groupedChecklists = computed<ChecklistGroup[]>(() => {
    const categoryMap = new Map<number, ChecklistGroup>();

    for (const category of this.categories()) {
      categoryMap.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        items: []
      });
    }

    for (const checklist of this.checklists()) {
      const existing = categoryMap.get(checklist.categoryId);
      if (existing) {
        existing.items.push(checklist);
      } else {
        categoryMap.set(checklist.categoryId, {
          categoryId: checklist.categoryId,
          categoryName: checklist.categoryName || `Category ${checklist.categoryId}`,
          items: [checklist]
        });
      }
    }

    return Array.from(categoryMap.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => a.order - b.order)
      }))
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  });

  protected readonly formTitle = computed(() =>
    this.editingChecklistId() ? 'Update Checklist Item' : 'Create Checklist Item'
  );

  protected readonly activeGroup = computed<ChecklistGroup | null>(() => {
    const groups = this.groupedChecklists();
    if (groups.length === 0) {
      return null;
    }

    const activeId = this.activeCategoryId();
    if (activeId === null) {
      return groups[0];
    }

    const matched = groups.find((group) => group.categoryId === activeId);
    return matched ?? groups[0];
  });

  protected readonly checklistForm = new FormGroup({
    categoryId: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    }),
    checkingItemName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    evaluationCriteria: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    maxScore: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    }),
    order: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    })
  });

  constructor() {
    this.loadCategories();
    this.loadChecklists();
  }

  protected saveChecklist(): void {
    if (this.checklistForm.invalid || this.isSaving()) {
      this.checklistForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload: CreateChecklistDto = this.checklistForm.getRawValue();
    const editingId = this.editingChecklistId();

    if (editingId) {
      const updatePayload: UpdateChecklistDto = {
        id: editingId,
        ...payload
      };

      this.checklistService
        .update(updatePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.toastService.success('Checklist item updated successfully.');
            this.closeModal();
            this.loadChecklists();
          },
          error: () => {
            this.toastService.error('Unable to update checklist item.');
          }
        });

      return;
    }

    this.checklistService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Checklist item created successfully.');
          this.closeModal();
          this.loadChecklists();
        },
        error: () => {
          this.toastService.error('Unable to create checklist item.');
        }
      });
  }

  protected onView(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid checklist selection.');
      return;
    }

    this.checklistService.getById(id).subscribe({
      next: (item) => {
        this.selectedChecklist.set(item);
        this.modalMode.set('view');
      },
      error: () => {
        this.toastService.error('Unable to load checklist item details.');
      }
    });
  }

  protected onEdit(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid checklist selection.');
      return;
    }

    this.checklistService.getById(id).subscribe({
      next: (item) => {
        this.editingChecklistId.set(item.id);
        this.selectedChecklist.set(item);
        this.modalMode.set('edit');
        this.checklistForm.setValue({
          categoryId: item.categoryId,
          checkingItemName: item.checkingItemName,
          evaluationCriteria: item.evaluationCriteria,
          maxScore: item.maxScore,
          order: item.order
        });
      },
      error: () => {
        this.toastService.error('Unable to load checklist item for editing.');
      }
    });
  }

  protected onDelete(row: TableRow): void {
    const id = this.getIdFromRow(row);
    if (!id) {
      this.toastService.error('Invalid checklist selection.');
      return;
    }

    this.checklistService.delete(id).subscribe({
      next: () => {
        this.toastService.success('Checklist item deleted successfully.');
        if (this.editingChecklistId() === id) {
          this.resetForm();
        }
        this.loadChecklists();
      },
      error: () => {
        this.toastService.error('Unable to delete checklist item.');
      }
    });
  }

  protected selectCategory(categoryId: number): void {
    this.activeCategoryId.set(categoryId);
  }

  protected isCategoryActive(categoryId: number): boolean {
    return this.activeGroup()?.categoryId === categoryId;
  }

  protected resetForm(): void {
    this.editingChecklistId.set(null);
    this.selectedChecklist.set(null);

    const defaultCategory = this.categories()[0]?.id ?? 0;

    this.checklistForm.reset({
      categoryId: defaultCategory,
      checkingItemName: '',
      evaluationCriteria: '',
      maxScore: 5,
      order: 1
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.modalMode.set('create');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.resetForm();
  }

  protected trackByCategory(_index: number, group: ChecklistGroup): number {
    return group.categoryId;
  }

  protected trackByChecklist(_index: number, item: ChecklistDto): number {
    return item.id;
  }

  protected resolveCategoryName(id: number): string {
    const category = this.categories().find((item) => item.id === id);
    return category?.name ?? String(id);
  }

  private getIdFromRow(row: TableRow): number | null {
    const raw = row['id'];
    if (typeof raw === 'number') {
      return raw;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (categories) => {
        const sorted = [...categories].sort((a, b) => a.order - b.order);
        this.categories.set(sorted);

        if (this.activeCategoryId() === null && sorted.length > 0) {
          this.activeCategoryId.set(sorted[0].id);
        }

        const currentCategoryId = this.checklistForm.controls.categoryId.value;
        if (currentCategoryId <= 0 && sorted.length > 0) {
          this.checklistForm.patchValue({ categoryId: sorted[0].id });
        }
      },
      error: () => {
        this.toastService.error('Unable to load checklist categories.');
      }
    });
  }

  private loadChecklists(): void {
    this.isTableLoading.set(true);

    this.checklistService
      .getAllWithoutPagination()
      .pipe(finalize(() => this.isTableLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.checklists.set(response ?? []);

          const groups = this.groupedChecklists();
          if (groups.length === 0) {
            this.activeCategoryId.set(null);
            return;
          }

          const activeId = this.activeCategoryId();
          if (activeId === null || !groups.some((group) => group.categoryId === activeId)) {
            this.activeCategoryId.set(groups[0].categoryId);
          }
        },
        error: () => {
          this.checklists.set([]);
          this.activeCategoryId.set(null);
          this.toastService.error('Unable to load checklist items.');
        }
      });
  }
}
