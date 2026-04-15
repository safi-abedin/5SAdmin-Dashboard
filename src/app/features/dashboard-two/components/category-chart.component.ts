import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DashboardTwoCategoryScoreDto } from '../../../core/models/dashboard-two.model';
import { buildChartPalette } from '../dashboard-two-chart.utils';

@Component({
  selector: 'app-category-chart',
  templateUrl: './category-chart.component.html',
  styleUrl: './category-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryChartComponent {
  readonly categories = input<DashboardTwoCategoryScoreDto[]>([]);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('categoryCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvasRef();
      const data = [...this.categories()].sort((left, right) => right.averageScore - left.averageScore);

      onCleanup(() => this.destroyChart());

      if (!canvas || data.length === 0) {
        this.destroyChart();
        return;
      }

      this.destroyChart();
      this.chart = new Chart(canvas.nativeElement, this.createConfig(data));
    });
  }

  private createConfig(data: DashboardTwoCategoryScoreDto[]): ChartConfiguration<'bar'> {
    const colors = buildChartPalette(data.length);

    return {
      type: 'bar',
      data: {
        labels: data.map((item) => item.categoryName),
        datasets: [
          {
            label: 'Average score',
            data: data.map((item) => item.averageScore),
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false
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
              label: (context) => `Average score: ${Number(context.parsed.y).toFixed(2)}%`
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
            max: 5,
            ticks: {
              callback: (value) => `${value}%`
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
