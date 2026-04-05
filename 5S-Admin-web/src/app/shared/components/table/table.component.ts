import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TableColumn, TableRow, TableSort, TableSortDirection } from './table.model';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent {
  readonly columns = input<readonly TableColumn[]>([]);
  readonly data = input<readonly TableRow[]>([]);
  readonly totalItems = input(0);
  readonly pageSize = input(10);
  readonly currentPage = input(1);
  readonly isLoading = input(false);

  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50]);
  readonly enableSearch = input(false);
  readonly searchPlaceholder = input('Search records...');

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly searchChange = output<string>();
  readonly sortChange = output<TableSort>();

  readonly view = output<TableRow>();
  readonly edit = output<TableRow>();
  readonly delete = output<TableRow>();

  protected readonly searchTerm = signal('');
  protected readonly activeSort = signal<TableSort>({ field: '', direction: '' });

  protected readonly totalPages = computed(() => {
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(this.totalItems() / size));
  });

  protected readonly visiblePageNumbers = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = Math.min(Math.max(this.currentPage(), 1), totalPages);
    const windowSize = 5;

    const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  });

  protected changePage(page: number): void {
    if (this.isLoading()) {
      return;
    }

    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.pageChange.emit(page);
  }

  protected onPageSizeChange(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    this.pageSizeChange.emit(parsed);
  }

  protected onPageSizeChangeEvent(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.onPageSizeChange(target.value);
  }

  protected onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.searchChange.emit(term.trim());
  }

  protected onSearchInputEvent(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.onSearchInput(target.value);
  }

  protected onSort(column: TableColumn): void {
    if (!column.sortable || this.isLoading()) {
      return;
    }

    const current = this.activeSort();
    const direction = this.getNextDirection(current, column.field);
    const sortState: TableSort = {
      field: column.field,
      direction
    };

    this.activeSort.set(sortState);
    this.sortChange.emit(sortState);
  }

  protected trackByColumn = (_index: number, column: TableColumn): string => column.field;
  protected trackByRow = (index: number, row: TableRow): string => String(row['id'] ?? index);

  protected resolveCellText(row: TableRow, field: string): string {
    const value = this.resolvePath(row, field);

    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  }

  protected getAlignClass(column: TableColumn): string {
    switch (column.align) {
      case 'center':
        return 'text-center';
      case 'end':
        return 'text-end';
      default:
        return 'text-start';
    }
  }

  protected getSortDirection(column: TableColumn): TableSortDirection {
    const sortState = this.activeSort();
    return sortState.field === column.field ? sortState.direction : '';
  }

  private getNextDirection(current: TableSort, field: string): TableSortDirection {
    if (current.field !== field) {
      return 'asc';
    }

    if (current.direction === 'asc') {
      return 'desc';
    }

    if (current.direction === 'desc') {
      return '';
    }

    return 'asc';
  }

  private resolvePath(row: TableRow, field: string): unknown {
    const segments = field.split('.');
    let value: unknown = row;

    for (const segment of segments) {
      if (typeof value !== 'object' || value === null) {
        return undefined;
      }

      value = (value as Record<string, unknown>)[segment];
    }

    return value;
  }
}
