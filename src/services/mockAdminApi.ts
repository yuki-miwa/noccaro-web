import { cloneInitialSnapshot } from '../data/mockData'
import type {
  AdminSnapshot,
  DashboardMetrics,
  MembershipRole,
  MemberAction,
  MemberActionType,
  ResolutionType,
  ReportReasonType,
  ReportStatus,
  SpaceMembership,
  SpacePost,
  WhisperStatus,
} from '../types/domain'

interface CreatePostInput {
  title: string
  body: string
  notifyMembers: boolean
  publishNow: boolean
}

interface UpdateSpaceSettingsInput {
  name?: string
  description?: string | null
  joinPolicy?: 'auto_approve' | 'approval_required'
  spaceCode?: string
  maxOwnerCount?: number
  whisperMaxLength?: number
  locationGridMeters?: number
  locationJitterEnabled?: boolean
  whisperTtlMinutes?: number
  whisperAutoHideReportThreshold?: number
  whisperRateLimitPerMinute?: number
  whisperRateLimitPer10Min?: number
}

interface SuspendInput {
  membershipId: number
  hours: number
  reason: string
}

interface MuteInput {
  membershipId: number
  hours: number
  reason: string
}

interface ResolveReportInput {
  reportId: number
  status: Extract<ReportStatus, 'resolved' | 'rejected'>
  resolutionType: ResolutionType | null
  note: string
}

interface CreateReportInput {
  reporterMembershipId: number
  targetType: 'whisper' | 'post' | 'member'
  targetId: number
  reasonType: ReportReasonType
  detail: string
}

interface PatchMembershipInput {
  membershipId: number
  role?: MembershipRole
  status?: 'active' | 'suspended' | 'kicked' | 'banned' | 'left'
  suspendedUntil?: string | null
  muteUntil?: string | null
  reason?: string
}

interface UpdatePostInput {
  postId: number
  title?: string
  body?: string
  status?: 'draft' | 'published' | 'archived' | 'deleted'
  notifyMembers?: boolean
  visibleFrom?: string | null
  visibleTo?: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

function inHoursIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function delay(ms = 160): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export class MockApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'MockApiError'
  }
}

export class MockAdminApi {
  private snapshot: AdminSnapshot

  constructor(seed?: AdminSnapshot) {
    this.snapshot = seed ? structuredClone(seed) : cloneInitialSnapshot()
  }

  async getSnapshot(): Promise<AdminSnapshot> {
    await delay()
    return structuredClone(this.snapshot)
  }

  async reset(): Promise<AdminSnapshot> {
    await delay(80)
    this.snapshot = cloneInitialSnapshot()
    return structuredClone(this.snapshot)
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay(80)
    const activeMemberships = this.snapshot.memberships.filter(
      (membership) => membership.spaceId === this.snapshot.activeSpaceId,
    )
    const metrics: DashboardMetrics = {
      activeMemberCount: activeMemberships.filter(
        (membership) => membership.status === 'active',
      ).length,
      pendingMemberCount: activeMemberships.filter(
        (membership) => membership.status === 'pending',
      ).length,
      activeWhisperCount: this.snapshot.whispers.filter(
        (whisper) => whisper.spaceId === this.snapshot.activeSpaceId && whisper.status === 'active',
      ).length,
      hiddenWhisperCount: this.snapshot.whispers.filter(
        (whisper) =>
          whisper.spaceId === this.snapshot.activeSpaceId &&
          (whisper.status === 'hidden_by_report' || whisper.status === 'removed_by_owner'),
      ).length,
      openReportCount: this.snapshot.reports.filter(
        (report) => report.spaceId === this.snapshot.activeSpaceId && report.status === 'open',
      ).length,
      publishedPostCount: this.snapshot.posts.filter(
        (post) => post.spaceId === this.snapshot.activeSpaceId && post.status === 'published',
      ).length,
    }
    return metrics
  }

  async updateSpaceSettings(input: UpdateSpaceSettingsInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanManageSpace(actor.role)

    const activeSpace = this.getActiveSpace()
    const maxOwnerCount =
      input.maxOwnerCount !== undefined ? Math.max(1, Math.floor(input.maxOwnerCount)) : activeSpace.maxOwnerCount

    if (maxOwnerCount < this.countActiveOwners(activeSpace.id)) {
      throw new MockApiError(
        'owner_limit_too_low',
        'Cannot lower max owner count below current active owner count.',
      )
    }

    activeSpace.joinPolicy = input.joinPolicy ?? activeSpace.joinPolicy
    activeSpace.name = input.name ?? activeSpace.name
    activeSpace.description = input.description ?? activeSpace.description
    activeSpace.spaceCode = input.spaceCode ?? activeSpace.spaceCode
    activeSpace.maxOwnerCount = maxOwnerCount
    activeSpace.whisperMaxLength = input.whisperMaxLength ?? activeSpace.whisperMaxLength
    activeSpace.locationGridMeters = input.locationGridMeters ?? activeSpace.locationGridMeters
    activeSpace.locationJitterEnabled = input.locationJitterEnabled ?? activeSpace.locationJitterEnabled
    activeSpace.whisperTtlMinutes = input.whisperTtlMinutes ?? activeSpace.whisperTtlMinutes
    activeSpace.whisperAutoHideReportThreshold =
      input.whisperAutoHideReportThreshold ?? activeSpace.whisperAutoHideReportThreshold
    activeSpace.whisperRateLimitPerMinute =
      input.whisperRateLimitPerMinute ?? activeSpace.whisperRateLimitPerMinute
    activeSpace.whisperRateLimitPer10Min =
      input.whisperRateLimitPer10Min ?? activeSpace.whisperRateLimitPer10Min

    return structuredClone(this.snapshot)
  }

  async setCurrentUser(userId: number): Promise<AdminSnapshot> {
    await delay(20)
    const user = this.snapshot.users.find((item) => item.id === userId)
    if (!user) {
      throw new MockApiError('user_not_found', 'User not found.')
    }
    this.snapshot.currentUserId = userId
    return structuredClone(this.snapshot)
  }

  async setActiveSpace(spaceId: number): Promise<AdminSnapshot> {
    await delay(20)
    const space = this.snapshot.spaces.find((item) => item.id === spaceId)
    if (!space) {
      throw new MockApiError('space_not_found', 'Space not found.')
    }
    this.snapshot.activeSpaceId = spaceId
    return structuredClone(this.snapshot)
  }

  async approveMembership(membershipId: number, reason = 'Approved by owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const membership = this.findMembership(membershipId)
    if (membership.status !== 'pending') {
      throw new MockApiError('invalid_membership_state', 'Only pending memberships can be approved.')
    }

    membership.status = 'active'
    membership.joinedAt = nowIso()
    membership.approvedAt = nowIso()
    membership.approvedByMembershipId = actor.id
    membership.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: membership.id,
      actionType: 'approve',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async rejectMembership(membershipId: number, reason = 'Rejected by owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const membership = this.findMembership(membershipId)
    if (membership.status !== 'pending') {
      throw new MockApiError('invalid_membership_state', 'Only pending memberships can be rejected.')
    }

    membership.status = 'rejected'
    membership.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: membership.id,
      actionType: 'reject',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async grantOwner(membershipId: number, reason = 'Promoted to owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertPrimaryOwner(actor.role)

    const membership = this.findMembership(membershipId)
    if (membership.status !== 'active') {
      throw new MockApiError('invalid_membership_state', 'Only active members can be promoted to owner.')
    }
    if (membership.role === 'primary_owner' || membership.role === 'owner') {
      throw new MockApiError('invalid_role_transition', 'Member is already in an owner role.')
    }

    const activeSpace = this.getActiveSpace()
    if (this.countActiveOwners(activeSpace.id) >= activeSpace.maxOwnerCount) {
      throw new MockApiError('owner_limit_reached', 'Owner slot limit reached for this space.')
    }

    membership.role = 'owner'
    membership.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: membership.id,
      actionType: 'grant_owner',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async revokeOwner(membershipId: number, reason = 'Owner role revoked'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertPrimaryOwner(actor.role)

    const membership = this.findMembership(membershipId)
    if (membership.role !== 'owner') {
      throw new MockApiError('invalid_role_transition', 'Only owner role can be revoked.')
    }

    membership.role = 'guest'
    membership.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: membership.id,
      actionType: 'revoke_owner',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async transferPrimaryOwner(targetMembershipId: number, reason = 'Transfer primary owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertPrimaryOwner(actor.role)

    const targetMembership = this.findMembership(targetMembershipId)
    if (targetMembership.status !== 'active') {
      throw new MockApiError('invalid_membership_state', 'Target member must be active.')
    }

    if (targetMembership.id === actor.id) {
      throw new MockApiError('invalid_target', 'Target member must be different from current primary owner.')
    }

    if (targetMembership.role === 'guest') {
      targetMembership.role = 'owner'
    }

    actor.role = 'owner'
    targetMembership.role = 'primary_owner'
    actor.updatedAt = nowIso()
    targetMembership.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: targetMembership.id,
      actionType: 'transfer_primary_owner',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async muteMember(input: MuteInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const target = this.findMembership(input.membershipId)
    this.assertActiveTargetForModeration(target)

    target.muteUntil = inHoursIso(input.hours)
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'mute',
      reason: input.reason,
      endsAt: target.muteUntil,
    })

    return structuredClone(this.snapshot)
  }

  async unmuteMember(membershipId: number, reason = 'Mute removed'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const target = this.findMembership(membershipId)
    target.muteUntil = null
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'unmute',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async kickMember(membershipId: number, reason = 'Kicked by owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const target = this.findMembership(membershipId)
    this.assertNotPrimaryOwner(target)

    target.status = 'kicked'
    target.kickedAt = nowIso()
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'kick',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async suspendMember(input: SuspendInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const target = this.findMembership(input.membershipId)
    this.assertNotPrimaryOwner(target)

    target.status = 'suspended'
    target.suspendedUntil = inHoursIso(input.hours)
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'suspend',
      reason: input.reason,
      endsAt: target.suspendedUntil,
    })

    return structuredClone(this.snapshot)
  }

  async unsuspendMember(membershipId: number, reason = 'Suspension removed'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const target = this.findMembership(membershipId)

    target.status = 'active'
    target.suspendedUntil = null
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'unsuspend',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async banMember(membershipId: number, reason = 'Permanently banned'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertPrimaryOwner(actor.role)

    const target = this.findMembership(membershipId)
    this.assertNotPrimaryOwner(target)

    target.status = 'banned'
    target.bannedAt = nowIso()
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'ban',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async unbanMember(membershipId: number, reason = 'Ban removed by primary owner'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertPrimaryOwner(actor.role)

    const target = this.findMembership(membershipId)
    target.status = 'active'
    target.bannedAt = null
    target.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: target.id,
      actionType: 'unban',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async createPost(input: CreatePostInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    if (actor.role !== 'owner' && actor.role !== 'primary_owner') {
      throw new MockApiError('forbidden', 'Only owner roles can create posts.')
    }

    const nextId = this.getNextId(this.snapshot.posts)
    const timestamp = nowIso()
    const status = input.publishNow ? 'published' : 'draft'

    const post: SpacePost = {
      id: nextId,
      publicId: `pst-${String(nextId).padStart(4, '0')}`,
      spaceId: this.snapshot.activeSpaceId,
      authorMembershipId: actor.id,
      title: input.title,
      body: input.body,
      status,
      notifyMembers: input.notifyMembers,
      publishedAt: input.publishNow ? timestamp : null,
      visibleFrom: input.publishNow ? timestamp : null,
      visibleTo: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.snapshot.posts.unshift(post)

    if (input.notifyMembers) {
      const notificationId = this.getNextId(this.snapshot.notifications)
      this.snapshot.notifications.unshift({
        id: notificationId,
        publicId: `ntf-${String(notificationId).padStart(4, '0')}`,
        spaceId: this.snapshot.activeSpaceId,
        sourceType: 'post',
        sourceId: post.id,
        createdByMembershipId: actor.id,
        title: `New owner article: ${post.title}`,
        body: post.body.slice(0, 120),
        targetScope: 'all_active_members',
        status: 'queued',
        scheduledAt: timestamp,
        sentAt: null,
        createdAt: timestamp,
      })
    }

    return structuredClone(this.snapshot)
  }

  async updatePost(input: UpdatePostInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    if (actor.role !== 'owner' && actor.role !== 'primary_owner') {
      throw new MockApiError('forbidden', 'Only owner roles can update posts.')
    }

    const post = this.snapshot.posts.find((item) => item.id === input.postId)
    if (!post) {
      throw new MockApiError('post_not_found', 'Post not found.')
    }

    post.title = input.title ?? post.title
    post.body = input.body ?? post.body
    post.status = input.status ?? post.status
    post.notifyMembers = input.notifyMembers ?? post.notifyMembers
    post.visibleFrom = input.visibleFrom ?? post.visibleFrom
    post.visibleTo = input.visibleTo ?? post.visibleTo
    post.updatedAt = nowIso()

    if (post.status === 'published' && !post.publishedAt) {
      post.publishedAt = nowIso()
    }

    return structuredClone(this.snapshot)
  }

  async publishPost(postId: number, notifyMembers: boolean): Promise<AdminSnapshot> {
    await delay()
    const post = this.snapshot.posts.find((item) => item.id === postId)
    if (!post) {
      throw new MockApiError('post_not_found', 'Post not found.')
    }

    post.status = 'published'
    post.notifyMembers = notifyMembers
    post.publishedAt = nowIso()
    post.visibleFrom = post.visibleFrom ?? nowIso()
    post.updatedAt = nowIso()

    if (notifyMembers) {
      const actor = this.getCurrentMembership(true)
      const notificationId = this.getNextId(this.snapshot.notifications)
      this.snapshot.notifications.unshift({
        id: notificationId,
        publicId: `ntf-${String(notificationId).padStart(4, '0')}`,
        spaceId: this.snapshot.activeSpaceId,
        sourceType: 'post',
        sourceId: post.id,
        createdByMembershipId: actor.id,
        title: `Published: ${post.title}`,
        body: post.body.slice(0, 120),
        targetScope: 'all_active_members',
        status: 'queued',
        scheduledAt: nowIso(),
        sentAt: null,
        createdAt: nowIso(),
      })
    }

    return structuredClone(this.snapshot)
  }

  async archivePost(postId: number): Promise<AdminSnapshot> {
    await delay()
    const post = this.snapshot.posts.find((item) => item.id === postId)
    if (!post) {
      throw new MockApiError('post_not_found', 'Post not found.')
    }
    post.status = 'archived'
    post.updatedAt = nowIso()
    return structuredClone(this.snapshot)
  }

  async deletePost(postId: number): Promise<AdminSnapshot> {
    await delay()
    const post = this.snapshot.posts.find((item) => item.id === postId)
    if (!post) {
      throw new MockApiError('post_not_found', 'Post not found.')
    }
    post.status = 'deleted'
    post.updatedAt = nowIso()
    return structuredClone(this.snapshot)
  }

  async removeWhisper(whisperId: number, reason = 'Removed by moderator'): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const whisper = this.snapshot.whispers.find((item) => item.id === whisperId)
    if (!whisper) {
      throw new MockApiError('whisper_not_found', 'Whisper not found.')
    }

    whisper.status = 'removed_by_owner'
    whisper.removedAt = nowIso()
    whisper.removedByMembershipId = actor.id
    whisper.updatedAt = nowIso()

    this.recordMemberAction({
      targetMembershipId: whisper.membershipId,
      actionType: 'remove_whisper',
      reason,
    })

    return structuredClone(this.snapshot)
  }

  async expireWhispers(): Promise<AdminSnapshot> {
    await delay(60)
    const now = Date.now()
    this.snapshot.whispers = this.snapshot.whispers.map((whisper) => {
      if (whisper.status === 'active' && new Date(whisper.expiresAt).getTime() <= now) {
        return {
          ...whisper,
          status: 'expired' as WhisperStatus,
          updatedAt: nowIso(),
        }
      }
      return whisper
    })
    return structuredClone(this.snapshot)
  }

  async resolveReport(input: ResolveReportInput): Promise<AdminSnapshot> {
    await delay()
    const actor = this.getCurrentMembership(true)
    this.assertCanModerate(actor.role)

    const report = this.snapshot.reports.find((item) => item.id === input.reportId)
    if (!report) {
      throw new MockApiError('report_not_found', 'Report not found.')
    }

    report.status = input.status
    report.handledByMembershipId = actor.id
    report.handledAt = nowIso()
    report.resolutionType = input.resolutionType
    report.updatedAt = nowIso()

    if (report.targetType === 'whisper' && input.resolutionType === 'content_removed') {
      const whisper = this.snapshot.whispers.find((item) => item.id === report.targetId)
      if (whisper && whisper.status !== 'removed_by_owner') {
        whisper.status = 'removed_by_owner'
        whisper.removedAt = nowIso()
        whisper.removedByMembershipId = actor.id
        whisper.updatedAt = nowIso()
      }
    }

    if (report.targetType === 'member') {
      const actionTypeByResolution: Partial<Record<ResolutionType, MemberActionType>> = {
        mute: 'mute',
        kick: 'kick',
        suspend: 'suspend',
        ban: 'ban',
      }

      if (input.resolutionType && actionTypeByResolution[input.resolutionType]) {
        this.recordMemberAction({
          targetMembershipId: report.targetId,
          actionType: actionTypeByResolution[input.resolutionType] as MemberActionType,
          reason: input.note,
          relatedReportId: report.id,
        })
      }
    }

    return structuredClone(this.snapshot)
  }

  async createReport(input: CreateReportInput): Promise<AdminSnapshot> {
    await delay()

    const reporter = this.findMembership(input.reporterMembershipId)
    if (reporter.status !== 'active') {
      throw new MockApiError('invalid_membership_state', 'Reporter membership must be active.')
    }

    const duplicated = this.snapshot.reports.find(
      (report) =>
        report.reporterMembershipId === input.reporterMembershipId &&
        report.targetType === input.targetType &&
        report.targetId === input.targetId,
    )

    if (duplicated) {
      throw new MockApiError('duplicate_report', 'Duplicate report for the same target by same member.')
    }

    const now = nowIso()
    const reportId = this.getNextId(this.snapshot.reports)

    this.snapshot.reports.unshift({
      id: reportId,
      publicId: `rpt-${String(reportId).padStart(4, '0')}`,
      spaceId: this.snapshot.activeSpaceId,
      reporterMembershipId: input.reporterMembershipId,
      targetType: input.targetType,
      targetId: input.targetId,
      reasonType: input.reasonType,
      detail: input.detail,
      status: 'open',
      handledByMembershipId: null,
      handledAt: null,
      resolutionType: null,
      createdAt: now,
      updatedAt: now,
    })

    if (input.targetType === 'whisper') {
      const whisper = this.snapshot.whispers.find((item) => item.id === input.targetId)
      if (whisper) {
        whisper.reportCount += 1
        whisper.updatedAt = now

        const threshold = this.getActiveSpace().whisperAutoHideReportThreshold
        if (whisper.reportCount >= threshold && whisper.status === 'active') {
          whisper.status = 'hidden_by_report'
          whisper.hiddenAt = now
          whisper.updatedAt = now
        }
      }
    }

    return structuredClone(this.snapshot)
  }

  async patchMembership(input: PatchMembershipInput): Promise<AdminSnapshot> {
    await delay()

    if (input.role === 'primary_owner') {
      await this.transferPrimaryOwner(input.membershipId, input.reason ?? 'Primary owner transferred')
    } else if (input.role === 'owner') {
      await this.grantOwner(input.membershipId, input.reason ?? 'Promoted to owner')
    } else if (input.role === 'guest') {
      const targetMembership = this.findMembership(input.membershipId)
      if (targetMembership.role === 'owner') {
        await this.revokeOwner(input.membershipId, input.reason ?? 'Owner revoked')
      }
    }

    if (input.muteUntil !== undefined) {
      if (input.muteUntil) {
        const hours = Math.max(1, Math.ceil((new Date(input.muteUntil).getTime() - Date.now()) / (60 * 60 * 1000)))
        await this.muteMember({
          membershipId: input.membershipId,
          hours,
          reason: input.reason ?? 'Muted by patch',
        })
      } else {
        await this.unmuteMember(input.membershipId, input.reason ?? 'Mute removed')
      }
    }

    if (input.status === 'suspended') {
      const hours = Math.max(
        1,
        Math.ceil((new Date(input.suspendedUntil ?? nowIso()).getTime() - Date.now()) / (60 * 60 * 1000)),
      )
      await this.suspendMember({
        membershipId: input.membershipId,
        hours,
        reason: input.reason ?? 'Suspended by patch',
      })
    } else if (input.status === 'kicked') {
      await this.kickMember(input.membershipId, input.reason ?? 'Kicked by patch')
    } else if (input.status === 'banned') {
      await this.banMember(input.membershipId, input.reason ?? 'Banned by patch')
    } else if (input.status === 'active') {
      const targetMembership = this.findMembership(input.membershipId)
      if (targetMembership.status === 'suspended') {
        await this.unsuspendMember(input.membershipId, input.reason ?? 'Suspension removed')
      }
      if (targetMembership.status === 'banned') {
        await this.unbanMember(input.membershipId, input.reason ?? 'Ban removed')
      }
    } else if (input.status === 'left') {
      const actor = this.getCurrentMembership(true)
      this.assertCanModerate(actor.role)
      const targetMembership = this.findMembership(input.membershipId)
      this.assertNotPrimaryOwner(targetMembership)
      targetMembership.status = 'left'
      targetMembership.leftAt = nowIso()
      targetMembership.updatedAt = nowIso()
    }

    return structuredClone(this.snapshot)
  }

  private getActiveSpace() {
    const space = this.snapshot.spaces.find((item) => item.id === this.snapshot.activeSpaceId)
    if (!space) {
      throw new MockApiError('space_not_found', 'Active space is not configured.')
    }
    return space
  }

  private getCurrentMembership(onlyActive = false): SpaceMembership {
    const membership = this.snapshot.memberships.find(
      (item) => item.spaceId === this.snapshot.activeSpaceId && item.userId === this.snapshot.currentUserId,
    )

    if (!membership) {
      throw new MockApiError('membership_not_found', 'Current user does not belong to this space.')
    }

    if (onlyActive && membership.status !== 'active') {
      throw new MockApiError('membership_inactive', 'Current membership is not active.')
    }

    return membership
  }

  private findMembership(membershipId: number): SpaceMembership {
    const membership = this.snapshot.memberships.find((item) => item.id === membershipId)
    if (!membership) {
      throw new MockApiError('membership_not_found', 'Membership not found.')
    }
    if (membership.spaceId !== this.snapshot.activeSpaceId) {
      throw new MockApiError('cross_space_operation', 'Cannot modify membership from another space.')
    }
    return membership
  }

  private countActiveOwners(spaceId: number): number {
    return this.snapshot.memberships.filter(
      (membership) =>
        membership.spaceId === spaceId && membership.status === 'active' && membership.role === 'owner',
    ).length
  }

  private assertCanModerate(role: MembershipRole): void {
    if (role !== 'owner' && role !== 'primary_owner') {
      throw new MockApiError('forbidden', 'This action requires owner privileges.')
    }
  }

  private assertCanManageSpace(role: MembershipRole): void {
    if (role !== 'primary_owner') {
      throw new MockApiError('forbidden', 'Only primary owner can change space settings.')
    }
  }

  private assertPrimaryOwner(role: MembershipRole): void {
    if (role !== 'primary_owner') {
      throw new MockApiError('forbidden', 'This action is restricted to primary owner.')
    }
  }

  private assertNotPrimaryOwner(target: SpaceMembership): void {
    if (target.role === 'primary_owner') {
      throw new MockApiError('forbidden_target', 'Cannot apply this action to primary owner.')
    }
  }

  private assertActiveTargetForModeration(target: SpaceMembership): void {
    this.assertNotPrimaryOwner(target)
    if (target.status !== 'active') {
      throw new MockApiError('invalid_membership_state', 'Target membership must be active.')
    }
  }

  private recordMemberAction(params: {
    targetMembershipId: number
    actionType: MemberActionType
    reason: string
    endsAt?: string | null
    relatedReportId?: number | null
  }): MemberAction {
    const actor = this.getCurrentMembership(false)
    const id = this.getNextId(this.snapshot.memberActions)

    const action: MemberAction = {
      id,
      spaceId: this.snapshot.activeSpaceId,
      targetMembershipId: params.targetMembershipId,
      actedByMembershipId: actor.id,
      actionType: params.actionType,
      reason: params.reason,
      startsAt: nowIso(),
      endsAt: params.endsAt ?? null,
      relatedReportId: params.relatedReportId ?? null,
      metadata: { source: 'mock_admin_console' },
      createdAt: nowIso(),
    }

    this.snapshot.memberActions.unshift(action)
    return action
  }

  private getNextId<T extends { id: number }>(items: T[]): number {
    if (items.length === 0) {
      return 1
    }
    return Math.max(...items.map((item) => item.id)) + 1
  }
}
