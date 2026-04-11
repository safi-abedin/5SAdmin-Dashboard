import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DashboardTwoZonePerformanceDto } from '../../../core/models/dashboard-two.model';
import { buildChartPalette } from '../dashboard-two-chart.utils';

@Component({
  selector: 'app-zone-chart',
  templateUrl: './zone-chart.component.html',
  styleUrl: './zone-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneChartComponent {
  readonly zones = input<DashboardTwoZonePerformanceDto[]>([]);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('zoneCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvasRef();
      const data = [...this.zones()].sort((left, right) => right.averagePercentage - left.averagePercentage);

      onCleanup(() => this.destroyChart());

      if (!canvas || data.length === 0) {
        this.destroyChart();
        return;
      }

      this.destroyChart();
      this.chart = new Chart(canvas.nativeElement, this.createConfig(data));
    });
  }

  private createConfig(data: DashboardTwoZonePerformanceDto[]): ChartConfiguration<'pie'> {
    const colors = buildChartPalette(data.length);

    return {
      type: 'pie',
      data: {
        labels: data.map((item) => item.zoneName),
        datasets: [
          {
            data: data.map((item) => item.averagePercentage),
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${Number(context.parsed).toFixed(2)}%`
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
