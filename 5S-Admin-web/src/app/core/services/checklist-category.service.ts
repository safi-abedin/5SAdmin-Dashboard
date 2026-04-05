import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistCategoryDto } from '../models/checklist-category.model';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class ChecklistCategoryService {
  private readonly api = inject(BaseApiService);

  getAll(): Observable<ChecklistCategoryDto[]> {
    return this.api.get<ChecklistCategoryDto[]>('checklistcategory');
  }
}
