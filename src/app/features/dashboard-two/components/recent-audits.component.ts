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

  viewAudit(index: number): void {
    console.log('View audit:', index);
  }

  deleteAudit(index: number): void {
    if (confirm('Are you sure you want to delete this audit?')) {
      console.log('Delete audit:', index);
    }
  }

  downloadAuditPdf(index: number): void {
    console.log('Download PDF for audit:', index);
  }
}
