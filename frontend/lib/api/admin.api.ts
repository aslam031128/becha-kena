import { apiClient } from './client';
import { ApiSuccessResponse } from '@/lib/types/api.types';

export interface AdminKycQueueItem {
  userId: string;
  phone: string;
  displayName: string | null;
  kycAttempts: number;
  submittedAt: string;
  slaAgingHours: number;
  slaStatus: 'healthy' | 'warning' | 'breached';
  frontImageKey?: string;
  backImageKey?: string;
  liveSelfieKey?: string;
  nidNumber?: string;
  dob?: string;
}

export interface AdminReportItem {
  id: string;
  reporterId: string | null;
  reporterName: string | null;
  entityType: 'listing' | 'chat' | 'user';
  entityId: string;
  reason: string;
  details?: string | null;
  status: 'pending' | 'investigating' | 'actioned' | 'dismissed';
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AdminDisputeItem {
  disputeId: string;
  dealId: string | null;
  buyer: {
    userId: string;
    displayName: string;
    phone: string;
  } | null;
  seller: {
    userId: string;
    displayName: string;
    phone: string;
  } | null;
  gdNumber: string;
  thanaName: string;
  gdFilingDate: string;
  gdDocumentUrl: string;
  status: string;
  resolutionAction: 'seller_banned' | 'claim_dismissed' | 'legal_hold' | null;
  createdAt: string;
}

export interface PhoneRevealAuditItem {
  buyerId: string;
  displayName: string | null;
  phone: string | null;
  isNidVerified: boolean;
  revealCount: number;
  lastRevealedAt: string;
  ipAddresses: string[];
  isAnomaly: boolean;
}

export interface AdminListingQueueItem {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  location?: {
    division?: string;
    thana?: string;
  };
  imageUrls: string[];
  videoUrl?: string | null;
  status: string;
  moderationStatus: string;
  createdAt: string;
  seller?: {
    id: string;
    displayName: string;
    phone: string;
    isNidVerified: boolean;
    role: string;
    memberSince: string;
  } | null;
}

export const adminApi = {
  getKycQueue: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<AdminKycQueueItem[]>>('/admin/kyc/queue', { params }),

  approveKyc: (userId: string) =>
    apiClient.patch<ApiSuccessResponse<{ userId: string; isNidVerified: boolean; kycStatus: string }>>(
      `/admin/kyc/${userId}/approve`
    ),

  rejectKyc: (userId: string, reason?: string) =>
    apiClient.patch<ApiSuccessResponse<{ userId: string; kycStatus: string; reason: string }>>(
      `/admin/kyc/${userId}/reject`,
      { reason }
    ),

  getReports: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<AdminReportItem[]>>('/admin/reports', { params }),

  actionReport: (
    reportId: string,
    action: 'dismiss' | 'quarantine' | 'warn' | 'escalate',
    notes?: string
  ) =>
    apiClient.patch<ApiSuccessResponse<{ message: string }>>(`/admin/reports/${reportId}/action`, {
      action,
      notes,
    }),

  getDisputes: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<AdminDisputeItem[]>>('/admin/disputes', { params }),

  resolveDispute: (
    disputeId: string,
    resolutionAction: 'seller_banned' | 'claim_dismissed' | 'legal_hold'
  ) =>
    apiClient.patch<ApiSuccessResponse<{ disputeId: string; resolutionAction: string; status: string }>>(
      `/admin/disputes/${disputeId}/resolve`,
      { resolutionAction }
    ),

  proposeBan: (userId: string, reason: string) =>
    apiClient.post<ApiSuccessResponse<{ userId: string; banProposedBy: string; status: string }>>(
      `/admin/users/${userId}/propose-ban`,
      { reason }
    ),

  confirmBan: (userId: string) =>
    apiClient.post<ApiSuccessResponse<{ userId: string; status: string }>>(
      `/admin/users/${userId}/confirm-ban`
    ),

  getPhoneRevealAudits: () =>
    apiClient.get<ApiSuccessResponse<PhoneRevealAuditItem[]>>('/admin/audits/phone-reveals'),

  getListingQueue: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<AdminListingQueueItem[]>>('/admin/listings/queue', { params }),

  approveListing: (id: string) =>
    apiClient.patch<ApiSuccessResponse<{ id: string; status: string; moderationStatus: string }>>(
      `/admin/listings/${id}/approve`
    ),

  rejectListing: (id: string, reason?: string) =>
    apiClient.patch<ApiSuccessResponse<{ id: string; status: string; moderationStatus: string }>>(
      `/admin/listings/${id}/reject`,
      { reason }
    ),
};
