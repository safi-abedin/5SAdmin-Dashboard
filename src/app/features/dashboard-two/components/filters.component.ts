import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  DashboardTwoCompanyOption,
  DashboardTwoUserOption
} from '../../../core/models/dashboard-two.model';

@Component({
  selector: 'app-dashboard-two-filters',
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersComponent {
  readonly showCompanySelector = input(false);
  readonly loading = input(false);
  readonly companies = input<DashboardTwoCompanyOption[]>([]);
  readonly users = input<DashboardTwoUserOption[]>([]);
  readonly selectedCompanyId = input<number | null>(null);
  readonly selectedUserId = input<number | null>(null);
  readonly fromDate = input('');
  readonly toDate = input('');

  readonly companyChange = output<number | null>();
  readonly userChange = output<number | null>();
  readonly fromDateChange = output<string>();
  readonly toDateChange = output<string>();

  protected onCompanyChange(value: string): void {
    const parsed = Number(value);
    this.companyChange.emit(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  protected onUserChange(value: string): void {
    const parsed = Number(value);
    this.userChange.emit(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  protected onFromDateChange(value: string): void {
    this.fromDateChange.emit(value);
  }

  protected onToDateChange(value: string): void {
    this.toDateChange.emit(value);
  }
}
