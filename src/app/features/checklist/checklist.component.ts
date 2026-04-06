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

interface ChecklistGroup {
  categoryId: number;
  categoryName: string;
  items: ChecklistDto[];
}

@Component({
  selector: 'app-checklist',
  imports: [ReactiveFormsModule],
  templateUrl: './checklist.component.html',
  styleUrl: './checklist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistComponent {
  private readonly checklistService = inject(ChecklistService);
  private readonly categoryService = inject(ChecklistCategoryService);
  private readonly toastService = inject(ToastService);

  private readonly checklists = signal<ChecklistDto[]>([]);
  protected readonly categories = signal<ChecklistCategoryDto[]>([]);
  protected readonly isTableLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly selectedChecklist = signal<ChecklistDto | null>(null);
  protected readonly editingChecklistId = signal<number | null>(null);
  protected readonly activeCategoryId = signal<number | null>(null);

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
            this.resetForm();
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
          this.resetForm();
          this.loadChecklists();
        },
        error: () => {
          this.toastService.error('Unable to create checklist item.');
        }
      });
  }

  protected onView(item: ChecklistDto): void {
    this.checklistService.getById(item.id).subscribe({
      next: (item) => {
        this.selectedChecklist.set(item);
        this.toastService.info(`Viewing checklist item: ${item.checkingItemName}`);
      },
      error: () => {
        this.toastService.error('Unable to load checklist item details.');
      }
    });
  }

  protected onEdit(item: ChecklistDto): void {
    this.checklistService.getById(item.id).subscribe({
      next: (item) => {
        this.editingChecklistId.set(item.id);
        this.selectedChecklist.set(item);
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

  protected onDelete(item: ChecklistDto): void {
    this.checklistService.delete(item.id).subscribe({
      next: () => {
        this.toastService.success('Checklist item deleted successfully.');
        if (this.editingChecklistId() === item.id) {
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
