export type UserStatus = 'active' | 'locked' | 'deleted'

export type JoinPolicy = 'auto_approve' | 'approval_required'
export type SpaceStatus = 'active' | 'archived' | 'deleted'

export type MembershipRole = 'guest' | 'owner' | 'primary_owner'
export type MembershipStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'left'
  | 'kicked'
  | 'suspended'
  | 'banned'

export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type ReactionType = 'like'

export type WhisperStatus =
  | 'active'
  | 'hidden_by_report'
  | 'removed_by_owner'
  | 'removed_by_system'
  | 'expired'

export type ReportTargetType = 'whisper' | 'post' | 'member'
export type ReportReasonType =
  | 'spam'
  | 'harassment'
  | 'privacy_risk'
  | 'inappropriate'
  | 'other'

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'rejected'
export type ResolutionType =
  | 'no_action'
  | 'content_removed'
  | 'mute'
  | 'kick'
  | 'suspend'
  | 'ban'

export type MemberActionType =
  | 'approve'
  | 'reject'
  | 'grant_owner'
  | 'revoke_owner'
  | 'transfer_primary_owner'
  | 'mute'
  | 'unmute'
  | 'kick'
  | 'suspend'
  | 'unsuspend'
  | 'ban'
  | 'unban'
  | 'remove_whisper'
  | 'remove_post'

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'cancelled'

export interface User {
  id: number
  publicId: string
  email: string
  displayName: string
  status: UserStatus
  createdAt: string
}

export interface Space {
  id: number
  publicId: string
  name: string
  spaceCode: string
  description: string
  status: SpaceStatus
  joinPolicy: JoinPolicy
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperAutoHideReportThreshold: number
  whisperRateLimitPerMinute: number
  whisperRateLimitPer10Min: number
  whisperMaxLength: number
  locationGridMeters: number
  createdByUserId: number
  createdAt: string
}

export interface SpaceMembership {
  id: number
  publicId: string
  spaceId: number
  userId: number
  role: MembershipRole
  status: MembershipStatus
  joinedAt: string | null
  approvedAt: string | null
  approvedByMembershipId: number | null
  leftAt: string | null
  kickedAt: string | null
  suspendedUntil: string | null
  bannedAt: string | null
  muteUntil: string | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SpacePost {
  id: number
  publicId: string
  spaceId: number
  authorMembershipId: number
  title: string
  body: string
  status: PostStatus
  notifyMembers: boolean
  publishedAt: string | null
  visibleFrom: string | null
  visibleTo: string | null
  createdAt: string
  updatedAt: string
}

export interface SpacePostReaction {
  id: number
  postId: number
  membershipId: number
  reactionType: ReactionType
  createdAt: string
}

export interface MapWhisper {
  id: number
  publicId: string
  spaceId: number
  membershipId: number
  body: string
  status: WhisperStatus
  gridKey: string
  displayLat: number
  displayLng: number
  displayRadiusM: number
  expiresAt: string
  hiddenAt: string | null
  removedAt: string | null
  removedByMembershipId: number | null
  reportCount: number
  createdAt: string
  updatedAt: string
}

export interface ContentReport {
  id: number
  publicId: string
  spaceId: number
  reporterMembershipId: number
  targetType: ReportTargetType
  targetId: number
  reasonType: ReportReasonType
  detail: string
  status: ReportStatus
  handledByMembershipId: number | null
  handledAt: string | null
  resolutionType: ResolutionType | null
  createdAt: string
  updatedAt: string
}

export interface MemberAction {
  id: number
  spaceId: number
  targetMembershipId: number
  actedByMembershipId: number
  actionType: MemberActionType
  reason: string
  startsAt: string
  endsAt: string | null
  relatedReportId: number | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
}

export interface Notification {
  id: number
  publicId: string
  spaceId: number
  sourceType: 'post' | 'system'
  sourceId: number | null
  createdByMembershipId: number
  title: string
  body: string
  targetScope: 'all_active_members' | 'owners_only'
  status: NotificationStatus
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
}

export interface AdminSnapshot {
  currentUserId: number
  activeSpaceId: number
  users: User[]
  spaces: Space[]
  memberships: SpaceMembership[]
  posts: SpacePost[]
  postReactions: SpacePostReaction[]
  whispers: MapWhisper[]
  reports: ContentReport[]
  memberActions: MemberAction[]
  notifications: Notification[]
}

export interface DashboardMetrics {
  activeMemberCount: number
  pendingMemberCount: number
  activeWhisperCount: number
  hiddenWhisperCount: number
  openReportCount: number
  publishedPostCount: number
}
