import type {
  ApiListMeta,
  JoinPolicy,
  MembershipStatus,
  ReportReasonType,
  ReportStatus,
  ResolutionType,
  SpaceRole,
  UserResource,
} from '../types/api'

export type SystemAdminRole = 'system_admin'
export type SystemSpaceStatus = 'active' | 'suspended' | 'archived' | 'deleted'

export interface SystemAdminUser {
  id: string
  email: string
  displayName: string
  role: SystemAdminRole
  createdAt: string
}

export interface SystemDashboardMetrics {
  spaceCount: number
  activeSpaceCount: number
  userCount: number
  lockedUserCount: number
  openReportCount: number
  orphanedPrimaryOwnerCount: number
}

export interface SystemSpaceResource {
  id: string
  code: string
  name: string
  description: string | null
  joinPolicy: JoinPolicy
  status: SystemSpaceStatus
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperMaxLength: number
  locationGridMeters: number
  locationJitterEnabled: boolean
  createdAt: string
}

export interface SystemSpaceOwnerSummary {
  membershipId: string | null
  userId: string | null
  displayName: string | null
  email: string | null
}

export interface SystemSpaceMetrics {
  memberCount: number
  pendingCount: number
  ownerCount: number
  openReportCount: number
}

export interface SystemSpaceSummary {
  space: SystemSpaceResource
  primaryOwner: SystemSpaceOwnerSummary
  metrics: SystemSpaceMetrics
}

export interface SystemUserMembershipSummary {
  membershipId: string
  spaceId: string
  spaceName: string
  role: SpaceRole
  status: MembershipStatus
}

export interface SystemUserSummary {
  user: UserResource
  memberships: SystemUserMembershipSummary[]
}

export interface SystemReportRecord {
  id: string
  spaceId: string
  targetType: 'whisper'
  targetId: string
  reasonType: ReportReasonType
  status: ReportStatus
  resolutionType: ResolutionType | null
  createdAt: string
  handledAt: string | null
}

export interface SystemReportSummary {
  report: SystemReportRecord
  space: Pick<SystemSpaceResource, 'id' | 'code' | 'name'>
  target: {
    id: string
    body: string
  }
  reporter: Pick<UserResource, 'id' | 'email' | 'displayName'>
}

export interface SystemAuditLog {
  id: string
  action: string
  entityType: 'space' | 'user' | 'membership' | 'report'
  entityId: string
  message: string
  createdAt: string
}

export interface SystemAdminAuthResult {
  token: string
  user: SystemAdminUser
}

export interface SystemAdminMeResult {
  user: SystemAdminUser
}

export interface SystemSpaceListResult {
  data: SystemSpaceSummary[]
  meta: ApiListMeta
}

export interface SystemUserListResult {
  data: SystemUserSummary[]
  meta: ApiListMeta
}

export interface SystemReportListResult {
  data: SystemReportSummary[]
  meta: ApiListMeta
}

export interface SystemAuditLogListResult {
  data: SystemAuditLog[]
  meta: ApiListMeta
}
