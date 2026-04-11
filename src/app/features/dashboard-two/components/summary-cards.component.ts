import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardTwoSummaryDto } from '../../../core/models/dashboard-two.model';

@Component({
  selector: 'app-summary-cards',
  imports: [DecimalPipe],
  templateUrl: './summary-cards.component.html',
  styleUrl: './summary-cards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryCardsComponent {
  readonly summary = input<DashboardTwoSummaryDto | null>(null);
}
