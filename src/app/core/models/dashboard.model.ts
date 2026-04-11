export interface DashboardStatusCountDto {
  status: string;
  count: number;
}

export interface DashboardTrendPointDto {
  label: string;
  count: number;
  averagePercentage: number | null;
}

export interface DashboardZoneInsightDto {
  zoneId: number;
  zoneName: string;
  auditCount: number;
  averagePercentage: number;
}

export interface DashboardRecentAuditDto {
  id: number;
  zoneId: number;
  auditDate: string;
  percentage: number;
  status: string;
}

export interface AnalyticsBasicDashboardDto {
  generatedAt: string;
  companyId: number | null;
  periodDays: number;
  totalAudits: number;
  averageAuditPercentage: number;
  totalRedTags: number;
  openRedTags: number;
  closedRedTags: number;
  auditStatusBreakdown: DashboardStatusCountDto[];
  redTagStatusBreakdown: DashboardStatusCountDto[];
  dailyAuditTrend: DashboardTrendPointDto[];
  dailyRedTagTrend: DashboardTrendPointDto[];
}

export interface DepartmentInsightDto {
  department: string;
  auditCount: number;
  averagePercentage: number;
}

export interface ScoreBandInsightDto {
  band: string;
  count: number;
}

export interface FeedbackSentimentInsightDto {
  goodCount: number;
  badCount: number;
}

export interface AnalyticsAdvancedDashboardDto extends AnalyticsBasicDashboardDto {
  zonePerformance: DashboardZoneInsightDto[];
  departmentInsights: DepartmentInsightDto[];
  scoreBandInsights: ScoreBandInsightDto[];
  feedbackSentiment: FeedbackSentimentInsightDto;
  recentLowPerformanceAudits: DashboardRecentAuditDto[];
  averageRedTagClosureDays: number | null;
}

export interface AuditorDashboardResponseDto {
  userId: number;
  companyId: number;
  userName: string;
  generatedAt: string;
  totalAudits: number;
  completedAudits: number;
  averageAuditPercentage: number;
  totalRedTags: number;
  openRedTags: number;
  closedRedTags: number;
  averageRedTagClosureDays: number | null;
  auditStatusBreakdown: DashboardStatusCountDto[];
  monthlyAuditTrend: DashboardTrendPointDto[];
  zoneInsights: DashboardZoneInsightDto[];
  recentAudits: DashboardRecentAuditDto[];
}
