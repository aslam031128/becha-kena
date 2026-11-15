import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';

export type ReportEntityType = 'listing' | 'chat' | 'user';

export type ReportReason =
  | 'scam_advance_demanded'
  | 'stolen_goods_suspected'
  | 'harassment'
  | 'counterfeit'
  | 'spam';

export type ReportStatus = 'pending' | 'investigating' | 'actioned' | 'dismissed';

export interface ReportItem {
  reportId: string;
  id?: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface CreateReportPayload {
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  details: string;
}

export const reportApi = {
  createReport: (data: CreateReportPayload) =>
    apiClient.post<ApiSuccessResponse<{ reportId: string; status: ReportStatus; createdAt: string }>>('/reports', data),

  getMyReports: () =>
    apiClient.get<ApiSuccessResponse<ReportItem[]>>('/reports/me'),
};
