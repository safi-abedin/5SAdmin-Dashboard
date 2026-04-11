import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardTwoTopPerformerDto } from '../../../core/models/dashboard-two.model';

@Component({
  selector: 'app-performers',
  imports: [DecimalPipe],
  templateUrl: './performers.component.html',
  styleUrl: './performers.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformersComponent {
  readonly performers = input<DashboardTwoTopPerformerDto[]>([]);
}
