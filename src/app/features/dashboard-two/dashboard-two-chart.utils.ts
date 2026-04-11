export const dashboardChartPalette = [
  '#0f62fe',
  '#16a34a',
  '#f97316',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#475569'
];

export function buildChartPalette(count: number): string[] {
  return Array.from({ length: count }, (_, index) => dashboardChartPalette[index % dashboardChartPalette.length]);
}

export function formatDashboardDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit'
  }).format(date);
}
