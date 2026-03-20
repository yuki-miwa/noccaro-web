import type {
  ApiListMeta,
  PostAudienceType,
  ReportReasonType,
  ReportStatus,
  ResolutionType,
} from '../../types/api'
import type {
  SystemAdminAuthResult,
  SystemAdminMeResult,
  SystemAuditLog,
  SystemDashboardMetrics,
  SystemAdminPostItem,
  SystemReportSummary,
  SystemSpaceResource,
  SystemSpaceStatus,
  SystemSpaceSummary,
  SystemUserSummary,
} from '../types'

export interface SystemSpaceListQuery {
  search?: string
  status?: SystemSpaceStatus | 'all'
  cursor?: string | null
  limit?: number
}

export interface SystemUserListQuery {
  search?: string
  status?: 'active' | 'locked' | 'deleted' | 'all'
  cursor?: string | null
  limit?: number
}

export interface SystemReportListQuery {
  status?: ReportStatus | 'all'
  reasonType?: ReportReasonType | 'all'
  spaceId?: string
  cursor?: string | null
  limit?: number
}

export interface CreateSystemSpaceInput {
  name: string
  description?: string | null
  spaceCode: string
  joinPolicy: 'auto_approve' | 'approval_required'
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperMaxLength: number
  locationGridMeters: number
  locationJitterEnabled: boolean
  initialPrimaryOwnerUserId: string
}

export interface PatchSystemSpaceInput {
  name?: string
  description?: string | null
  spaceCode?: string
  joinPolicy?: 'auto_approve' | 'approval_required'
  status?: SystemSpaceStatus
}

export interface AssignPrimaryOwnerInput {
  userId: string
  note?: string | null
}

export interface PatchSystemUserInput {
  status: 'active' | 'locked' | 'deleted'
  note?: string | null
}

export interface ResolveSystemReportInput {
  resolutionType: ResolutionType
  note?: string | null
}

export interface SystemPostListQuery {
  category?: 'all' | 'owner' | 'operation'
  cursor?: string | null
  limit?: number
}

export interface CreateOrUpdateSystemPostInput {
  category?: 'operation'
  audienceType?: PostAudienceType
  recipientUserIds?: string[]
  title?: string
  body?: string
  status?: 'draft' | 'published' | 'archived' | 'deleted'
  notifyMembers?: boolean
  visibleFrom?: string | null
  visibleTo?: string | null
}

export interface SystemAdminLoginInput {
  email: string
  password: string
}

export interface SystemAdminService {
  readonly mode: 'mock' | 'real'
  hasStoredSession(): boolean
  login(input: SystemAdminLoginInput): Promise<SystemAdminAuthResult>
  logout(): Promise<void>
  getMe(): Promise<SystemAdminMeResult>
  getDashboard(): Promise<SystemDashboardMetrics>
  getSpaces(query?: SystemSpaceListQuery): Promise<{ data: SystemSpaceSummary[]; meta: ApiListMeta }>
  createSpace(input: CreateSystemSpaceInput): Promise<SystemSpaceSummary>
  patchSpace(spaceId: string, input: PatchSystemSpaceInput): Promise<SystemSpaceResource>
  assignPrimaryOwner(spaceId: string, input: AssignPrimaryOwnerInput): Promise<SystemSpaceSummary>
  getSpacePosts(
    spaceId: string,
    query?: SystemPostListQuery,
  ): Promise<{ data: SystemAdminPostItem[]; meta: ApiListMeta }>
  createSpacePost(spaceId: string, input: CreateOrUpdateSystemPostInput): Promise<SystemAdminPostItem>
  updateSpacePost(postId: string, input: CreateOrUpdateSystemPostInput): Promise<SystemAdminPostItem>
  publishSpacePost(postId: string, notifyMembers: boolean): Promise<SystemAdminPostItem>
  archiveSpacePost(postId: string): Promise<SystemAdminPostItem>
  deleteSpacePost(postId: string): Promise<void>
  getUsers(query?: SystemUserListQuery): Promise<{ data: SystemUserSummary[]; meta: ApiListMeta }>
  patchUser(userId: string, input: PatchSystemUserInput): Promise<SystemUserSummary>
  getReports(query?: SystemReportListQuery): Promise<{ data: SystemReportSummary[]; meta: ApiListMeta }>
  resolveReport(reportId: string, input: ResolveSystemReportInput): Promise<SystemReportSummary>
  getAuditLogs(): Promise<{ data: SystemAuditLog[]; meta: ApiListMeta }>
  resetMock?(): Promise<void>
}
