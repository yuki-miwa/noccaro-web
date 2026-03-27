import type {
  AdminJoinRequestItem,
  AdminMemberItem,
  AdminReportItem,
  ApiListMeta,
  AuthResult,
  JoinedSpacesResult,
  LiveStreamStartResult,
  LiveThreadStateResult,
  MeResult,
  MembershipResource,
  NotificationSettingsResource,
  ProfileUpdateResult,
  PostAudienceType,
  PostCategory,
  PostResource,
  ReportResource,
  ResolutionType,
  SpaceDetailResult,
  WhisperResource,
} from '../types/api'

export interface MemberListQuery {
  status?: string
  role?: string
  search?: string
  cursor?: string | null
  limit?: number
}

export interface ReportListQuery {
  status?: string
  targetType?: string
  reasonType?: string
  cursor?: string | null
  limit?: number
}

export interface WhisperListQuery {
  south?: number
  west?: number
  north?: number
  east?: number
  limit?: number
}

export interface UpdateSpaceInput {
  name?: string
  description?: string | null
  joinPolicy?: 'auto_approve' | 'approval_required'
  spaceCode?: string
  whisperTtlMinutes?: number
  whisperMaxLength?: number
  locationGridMeters?: number
  locationJitterEnabled?: boolean
  whisperAutoHideReportThreshold?: number
  maxOwnerCount?: number
  whisperRateLimitPerMinute?: number
  whisperRateLimitPer10Min?: number
}

export interface PatchMembershipInput {
  role?: 'guest' | 'owner' | 'primary_owner'
  status?: 'active' | 'suspended' | 'kicked' | 'banned' | 'left'
  suspendedUntil?: string | null
  muteUntil?: string | null
  reason?: string
}

export interface CreateOrUpdatePostInput {
  category?: PostCategory
  audienceType?: PostAudienceType
  recipientUserIds?: string[]
  title?: string
  body?: string
  status?: 'draft' | 'published' | 'archived' | 'deleted'
  notifyMembers?: boolean
  visibleFrom?: string | null
  visibleTo?: string | null
}

export interface LiveLocationInput {
  currentLat: number
  currentLng: number
}

export interface UpdateLiveThreadScheduleInput {
  startsAt: string
  endsAt: string
  areaCenterLat: number
  areaCenterLng: number
  areaRadiusM: number
}

export interface ResolveReportInput {
  resolutionType: ResolutionType
  note?: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface UpdateProfileInput {
  displayName?: string
  email?: string
  currentPassword?: string
}

export interface AdminService {
  readonly mode: 'mock' | 'real'
  hasStoredSession(): boolean
  login(input: LoginInput): Promise<AuthResult>
  logout(): Promise<void>
  getMe(): Promise<MeResult>
  updateProfile(input: UpdateProfileInput): Promise<ProfileUpdateResult>
  getJoinedSpaces(): Promise<JoinedSpacesResult>
  getAdminSpace(spaceId: string): Promise<SpaceDetailResult>
  updateAdminSpace(spaceId: string, input: UpdateSpaceInput): Promise<SpaceDetailResult>
  getJoinRequests(spaceId: string): Promise<AdminJoinRequestItem[]>
  approveMembership(membershipId: string, note?: string | null): Promise<MembershipResource>
  rejectMembership(membershipId: string, note?: string | null): Promise<MembershipResource>
  getMembers(
    spaceId: string,
    query?: MemberListQuery,
  ): Promise<{ data: AdminMemberItem[]; meta: ApiListMeta }>
  patchMembership(membershipId: string, input: PatchMembershipInput): Promise<MembershipResource>
  getAdminPosts(spaceId: string): Promise<{ data: PostResource[]; meta: ApiListMeta }>
  createAdminPost(spaceId: string, input: CreateOrUpdatePostInput): Promise<PostResource>
  updateAdminPost(postId: string, input: CreateOrUpdatePostInput): Promise<PostResource>
  publishAdminPost(postId: string, notifyMembers: boolean): Promise<PostResource>
  archiveAdminPost(postId: string): Promise<PostResource>
  deleteAdminPost(postId: string): Promise<void>
  getAdminLiveSchedule(spaceId: string): Promise<LiveThreadStateResult>
  getLiveThread(spaceId: string, location?: Partial<LiveLocationInput>): Promise<LiveThreadStateResult>
  getLiveStream(spaceId: string, location?: Partial<LiveLocationInput>): Promise<LiveThreadStateResult>
  updateLiveThreadSchedule(spaceId: string, input: UpdateLiveThreadScheduleInput): Promise<LiveThreadStateResult>
  cancelLiveThreadSchedule(spaceId: string): Promise<LiveThreadStateResult>
  startLiveThread(spaceId: string, location: LiveLocationInput): Promise<LiveThreadStateResult>
  closeLiveThread(spaceId: string): Promise<LiveThreadStateResult>
  startLiveStream(spaceId: string): Promise<LiveStreamStartResult>
  endLiveStream(spaceId: string): Promise<LiveThreadStateResult>
  getWhispers(
    spaceId: string,
    query?: WhisperListQuery,
  ): Promise<{ data: WhisperResource[]; meta: Record<string, string | null> }>
  getReports(
    spaceId: string,
    query?: ReportListQuery,
  ): Promise<{ data: AdminReportItem[]; meta: ApiListMeta }>
  resolveReport(reportId: string, input: ResolveReportInput): Promise<ReportResource>
  removeWhisper(whisperId: string, reason?: string | null): Promise<WhisperResource>
  getNotificationSettings(): Promise<NotificationSettingsResource>
  resetMock?(): Promise<void>
}
