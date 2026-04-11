import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DashboardTwoTrendDto } from '../../../core/models/dashboard-two.model';
import { buildChartPalette, formatDashboardDate } from '../dashboard-two-chart.utils';

@Component({
  selector: 'app-trend-chart',
  templateUrl: './trend-chart.component.html',
  styleUrl: './trend-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrendChartComponent {
  readonly points = input<DashboardTwoTrendDto[]>([]);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('trendCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvasRef();
      const points = this.points();

      onCleanup(() => this.destroyChart());

      if (!canvas || points.length === 0) {
        this.destroyChart();
        return;
      }

      this.destroyChart();
      this.chart = new Chart(canvas.nativeElement, this.createConfig(points));
    });
  }

  private createConfig(points: DashboardTwoTrendDto[]): ChartConfiguration<'line'> {
    const labels = points.map((point) => formatDashboardDate(point.date));
    const colors = buildChartPalette(1);

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Audit count',
            data: points.map((point) => point.auditCount),
            borderColor: colors[0],
            backgroundColor: `${colors[0]}22`,
            pointBackgroundColor: colors[0],
            pointBorderColor: colors[0],
            pointRadius: 4,
            borderWidth: 2,
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const point = points[context.dataIndex];
                return `Audits: ${context.parsed.y}, Avg score: ${point.avgPercentage.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
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
