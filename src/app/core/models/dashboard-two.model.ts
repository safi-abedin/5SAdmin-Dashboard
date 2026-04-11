export interface DashboardTwoQueryParams {
  companyId: number;
  userId?: number | null;
  days?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface DashboardTwoSummaryDto {
  totalAudits: number;
  averagePercentage: number;
  totalRedTags: number;
  openRedTags: number;
  closedRedTags: number;
}

export interface DashboardTwoTrendDto {
  date: string;
  auditCount: number;
  avgPercentage: number;
}

export interface DashboardTwoCategoryScoreDto {
  categoryName: string;
  averageScore: number;
}

export interface DashboardTwoZonePerformanceDto {
  zoneName: string;
  averagePercentage: number;
}

export interface DashboardTwoTopPerformerDto {
  userName: string;
  averagePercentage: number;
}

export interface DashboardTwoRecentAuditDto {
  auditorName: string;
  department: string;
  percentage: number;
  auditDate: string;
}

export interface DashboardTwoFeedbackSummaryDto {
  totalFeedbacks: number;
  goodCount: number;
  badCount: number;
}

export interface DashboardTwoCompanyOption {
  id: number;
  companyName: string;
}

export interface DashboardTwoUserOption {
  id: number;
  name: string;
  username: string;
  companyId: number | null;
}
