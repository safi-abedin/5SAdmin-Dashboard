import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardTwoRecentAuditDto } from '../../../core/models/dashboard-two.model';

@Component({
  selector: 'app-recent-audits',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './recent-audits.component.html',
  styleUrl: './recent-audits.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentAuditsComponent {
  readonly audits = input<DashboardTwoRecentAuditDto[]>([]);
}
