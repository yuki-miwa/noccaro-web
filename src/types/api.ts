export type JoinPolicy = 'auto_approve' | 'approval_required'
export type SpaceRole = 'guest' | 'owner' | 'primary_owner'
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'kicked' | 'banned' | 'left'
export type WhisperStatus =
  | 'active'
  | 'hidden_by_report'
  | 'removed_by_owner'
  | 'removed_by_system'
  | 'expired'
export type ReportReasonType = 'spam' | 'harassment' | 'privacy_risk' | 'inappropriate' | 'other'
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'rejected'
export type ResolutionType = 'no_action' | 'content_removed' | 'mute' | 'kick' | 'suspend' | 'ban'
export type NotificationTargetScope = 'all_active_members' | 'owners_only'
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type PostCategory = 'owner' | 'operation'
export type PostAudienceType = 'all_members' | 'targeted_users'
export type LiveThreadStatus = 'active' | 'closed'
export type LiveStreamStatus = 'idle' | 'live' | 'ended'

export interface ApiListMeta {
  hasMore: boolean
  nextCursor: string | null
  limit?: number
}

export interface ApiListResponse<T, TMeta extends object = ApiListMeta> {
  data: T[]
  meta: TMeta
}

export interface ApiResponse<T> {
  data: T
}

export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface UserResource {
  id: string
  email: string
  displayName: string
  status: 'active' | 'locked' | 'deleted'
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface SpaceResource {
  id: string
  code: string
  name: string
  description: string | null
  joinPolicy: JoinPolicy
  status: 'active' | 'archived' | 'deleted'
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperMaxLength: number
  locationGridMeters: number
  locationJitterEnabled: boolean
  autoHideReportThreshold?: number
  postLimitPerMinute?: number
  postLimitPerTenMinutes?: number
  whisperAutoHideReportThreshold?: number
  whisperRateLimitPerMinute?: number
  whisperRateLimitPer10Min?: number
  createdAt: string
}

export interface MembershipResource {
  id: string
  spaceId: string
  userId: string
  role: SpaceRole
  status: MembershipStatus
  joinedAt: string | null
  approvedAt: string | null
  leftAt: string | null
  kickedAt: string | null
  bannedAt: string | null
  suspendedUntil: string | null
  muteUntil: string | null
  lastSeenAt: string | null
  createdAt: string
}

export interface JoinedSpaceSummary {
  space: SpaceResource
  membership: MembershipResource
  isSelected?: boolean
}

export interface PostResource {
  id: string
  spaceId: string
  authorMembershipId: string | null
  category: PostCategory
  audienceType: PostAudienceType
  title: string
  body: string
  status: PostStatus
  notifyMembers: boolean
  publishedAt: string | null
  visibleFrom: string | null
  visibleTo: string | null
  reactionCount: number
  reactedByMe: boolean
  isRead: boolean
  readAt: string | null
  targetedToMe: boolean
  recipientUserIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface LiveThreadResource {
  id: string
  spaceId: string | null
  status: LiveThreadStatus
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LiveStreamResource {
  id: string | null
  liveThreadId: string | null
  spaceId: string | null
  status: LiveStreamStatus
  isLive: boolean
  playbackUrl: string | null
  ingestEndpoint?: string
  channelArn?: string
  startedAt: string | null
  endedAt: string | null
}

export interface LivePermissionsResource {
  canWatch: boolean
  canComment: boolean
  canStartThread: boolean
  canCloseThread: boolean
  canStartStream: boolean
  canEndStream: boolean
  isPrimaryOwner: boolean
}

export interface LiveChatPolicyResource {
  roomId: string
  endpoint: string
  messageMaxLength: number
  cooldownSeconds: number
}

export interface LiveThreadStateResult {
  liveThread: LiveThreadResource | null
  liveStream: LiveStreamResource
  permissions: LivePermissionsResource
  chatPolicy?: LiveChatPolicyResource
  spaceId?: string
}

export interface LiveBroadcastResource {
  streamKey: string
  ingestEndpoint: string
  channelArn: string
}

export interface LiveStreamStartResult extends LiveThreadStateResult {
  broadcast: LiveBroadcastResource
}

export interface LiveChatTokenResult {
  chat: {
    roomArn: string
    roomId: string
    endpoint: string
    token: string
    expiresAt: string
    sessionExpiresAt: string
    messageMaxLength: number
    cooldownSeconds: number
  }
}

export interface WhisperImageResource {
  originalUrl: string
  previewUrl: string
  thumbnailUrl: string
  mimeType: string
  width: number
  height: number
  byteSize: number
}

export interface WhisperResource {
  id: string
  spaceId: string
  membershipId: string
  body: string
  status: WhisperStatus
  displayLat: number
  displayLng: number
  displayRadiusM: number
  expiresAt: string
  reportCount: number
  image: WhisperImageResource | null
  createdAt: string
}

export interface ReportResource {
  id: string
  spaceId: string
  reporterMembershipId: string
  targetType: 'whisper' | 'post' | 'member'
  targetId: string
  reasonType: ReportReasonType
  detail: string | null
  status: ReportStatus
  handledByMembershipId: string | null
  handledAt: string | null
  resolutionType: ResolutionType | null
  createdAt: string
}

export interface PushDeviceResource {
  id: string
  platform: 'ios' | 'android'
  pushToken: string
  deviceUuid: string | null
  appVersion: string | null
  osVersion: string | null
  isActive: boolean
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationSettingsResource {
  enabled: boolean
}

export interface ProfileStateResource {
  pendingEmail: string | null
}

export interface ProfileUpdateResult {
  user: UserResource
  profileUpdate: {
    emailChangeRequiresVerification: boolean
    pendingEmail: string | null
  }
}

export interface AdminJoinRequestItem {
  membership: MembershipResource
  user: UserResource
}

export interface AdminMemberItem {
  membership: MembershipResource
  user: UserResource
}

export interface AdminReportItem {
  report: ReportResource
  target: {
    type: 'whisper'
    whisper?: WhisperResource
  }
  reporter: {
    membership: MembershipResource
    user: UserResource
  }
}

export interface AuthResult {
  token: string
  user: UserResource
}

export interface MeResult {
  user: UserResource
  notificationSettings: NotificationSettingsResource
  profile: ProfileStateResource
}

export interface JoinedSpacesResult {
  joinedSpaces: JoinedSpaceSummary[]
}

export interface SpaceDetailResult {
  space: SpaceResource
  membership: MembershipResource
}

export interface MembershipResult {
  membership: MembershipResource
}

export interface PostResult {
  post: PostResource
}

export interface WhisperResult {
  whisper: WhisperResource
}

export interface ReportMutationResult {
  report: ReportResource
  whisper?: Pick<WhisperResource, 'id' | 'status' | 'reportCount'>
}
