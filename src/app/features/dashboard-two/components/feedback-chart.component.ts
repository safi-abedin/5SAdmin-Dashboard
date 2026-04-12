import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DashboardTwoFeedbackSummaryDto } from '../../../core/models/dashboard-two.model';
import { buildChartPalette } from '../dashboard-two-chart.utils';

@Component({
  selector: 'app-feedback-chart',
  templateUrl: './feedback-chart.component.html',
  styleUrl: './feedback-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackChartComponent {
  readonly feedback = input<DashboardTwoFeedbackSummaryDto | null>(null);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('feedbackCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvasRef();
      const feedback = this.feedback();

      onCleanup(() => this.destroyChart());

      if (!canvas || !feedback) {
        this.destroyChart();
        return;
      }

      this.destroyChart();
      this.chart = new Chart(canvas.nativeElement, this.createConfig(feedback));
    });
  }

  private createConfig(feedback: DashboardTwoFeedbackSummaryDto): ChartConfiguration<'doughnut'> {
    const colors = buildChartPalette(2);

    return {
      type: 'doughnut',
      data: {
        labels: ['Good feedback', 'Bad feedback'],
        datasets: [
          {
            data: [feedback.goodCount, feedback.badCount],
            backgroundColor: [ '#10b981','#ef4444'],
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${Number(context.parsed).toFixed(0)}`
            }
          }
        }
      }
    };
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
