export type TableSortDirection = 'asc' | 'desc' | '';

export type TableCellAlign = 'start' | 'center' | 'end';

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: TableCellAlign;
  toneMap?: Record<string, string>;
}

export interface TableRow {
  [key: string]: unknown;
}

export interface TableSort {
  field: string;
  direction: TableSortDirection;
}
