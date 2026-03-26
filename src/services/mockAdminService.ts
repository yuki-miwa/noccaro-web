import type {
  AdminJoinRequestItem,
  AdminMemberItem,
  AdminReportItem,
  ApiListMeta,
  AuthResult,
  JoinedSpaceSummary,
  JoinedSpacesResult,
  LivePermissionsResource,
  LiveStreamResource,
  LiveStreamStartResult,
  LiveThreadResource,
  LiveThreadStateResult,
  MeResult,
  MembershipResource,
  NotificationSettingsResource,
  ProfileUpdateResult,
  PostResource,
  ReportResource,
  SpaceDetailResult,
  SpaceResource,
  UserResource,
  WhisperResource,
} from '../types/api'
import type {
  AdminSnapshot,
  ContentReport,
  MapWhisper,
  Space,
  SpaceMembership,
  SpacePost,
  User,
} from '../types/domain'
import type {
  AdminService,
  CreateOrUpdatePostInput,
  LoginInput,
  MemberListQuery,
  PatchMembershipInput,
  ReportListQuery,
  ResolveReportInput,
  UpdateProfileInput,
  UpdateSpaceInput,
  WhisperListQuery,
} from './adminService'
import { MockAdminApi, MockApiError } from './mockAdminApi'
import { getAppStorage } from '../utils/storage'

const TOKEN_KEY = 'noccaro.admin.token'
const MOCK_PASSWORD = 'password123'
const storage = getAppStorage()

function nowIso(): string {
  return new Date().toISOString()
}

function mapMembershipStatus(status: AdminSnapshot['memberships'][number]['status']): MembershipResource['status'] {
  if (status === 'rejected') {
    return 'left'
  }
  return status
}

export class MockAdminService implements AdminService {
  readonly mode = 'mock' as const

  private readonly engine = new MockAdminApi()
  private token = storage.getItem(TOKEN_KEY)
  private readonly postConfigs = new Map<
    string,
    {
      category: 'owner'
      audienceType: 'all_members' | 'targeted_users'
      recipientUserIds: string[]
    }
  >()
  private readonly liveThreads = new Map<number, LiveThreadResource>()
  private readonly liveStreams = new Map<number, LiveStreamResource>()
  private liveSequence = 1

  hasStoredSession(): boolean {
    return Boolean(this.token)
  }

  async login(input: LoginInput): Promise<AuthResult> {
    if (input.password !== MOCK_PASSWORD) {
      throw new MockApiError('UNAUTHENTICATED', 'Invalid mock credentials.')
    }

    const snapshot = await this.engine.getSnapshot()
    const user = snapshot.users.find((item) => item.email === input.email)
    if (!user) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Mock user not found.')
    }

    const adminMembership = snapshot.memberships.find(
      (membership) =>
        membership.userId === user.id &&
        membership.status === 'active' &&
        (membership.role === 'owner' || membership.role === 'primary_owner'),
    )

    if (!adminMembership) {
      throw new MockApiError('FORBIDDEN', 'This mock user has no admin-capable membership.')
    }

    await this.engine.setCurrentUser(user.id)
    await this.engine.setActiveSpace(adminMembership.spaceId)

    this.token = `mock-token:${user.publicId}`
    storage.setItem(TOKEN_KEY, this.token)

    return {
      token: this.token,
      user: this.toUserResource(user),
    }
  }

  async logout(): Promise<void> {
    this.token = null
    storage.removeItem(TOKEN_KEY)
  }

  async getMe(): Promise<MeResult> {
    const snapshot = await this.getSessionSnapshot()
    const user = snapshot.users.find((item) => item.id === snapshot.currentUserId)
    if (!user) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Current mock user not found.')
    }

    return {
      user: this.toUserResource(user),
      notificationSettings: {
        enabled: true,
      },
      profile: {
        pendingEmail: null,
      },
    }
  }

  async updateProfile(input: UpdateProfileInput): Promise<ProfileUpdateResult> {
    const snapshot = await this.getSessionSnapshot()
    const user = snapshot.users.find((item) => item.id === snapshot.currentUserId)
    if (!user) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Current mock user not found.')
    }

    const nextDisplayName = input.displayName?.trim()
    const nextEmail = input.email?.trim().toLowerCase()
    const emailChanged = nextEmail !== undefined && nextEmail !== user.email.toLowerCase()

    if (!nextDisplayName && !nextEmail) {
      throw new MockApiError('VALIDATION_ERROR', 'displayName または email を指定してください。')
    }

    if (nextDisplayName !== undefined && nextDisplayName.length === 0) {
      throw new MockApiError('VALIDATION_ERROR', '表示名を入力してください。')
    }

    if (emailChanged && !input.currentPassword?.trim()) {
      throw new MockApiError('VALIDATION_ERROR', 'メールアドレスを変更するには現在のパスワードが必要です。')
    }

    if (emailChanged && input.currentPassword !== MOCK_PASSWORD) {
      throw new MockApiError('CURRENT_PASSWORD_INVALID', '現在のパスワードが正しくありません。')
    }

    if (
      emailChanged &&
      snapshot.users.some((item) => item.id !== user.id && item.email.toLowerCase() === nextEmail)
    ) {
      throw new MockApiError('EMAIL_ALREADY_TAKEN', 'このメールアドレスはすでに使われています。')
    }

    await this.engine.updateCurrentUserProfile({
      displayName: nextDisplayName,
      email: nextEmail,
    })

    const refreshed = await this.getMe()
    return {
      user: refreshed.user,
      profileUpdate: {
        emailChangeRequiresVerification: false,
        pendingEmail: null,
      },
    }
  }

  async getJoinedSpaces(): Promise<JoinedSpacesResult> {
    const snapshot = await this.getSessionSnapshot()
    const joinedSpaces: JoinedSpaceSummary[] = snapshot.memberships
      .filter((membership) => membership.userId === snapshot.currentUserId)
      .map((membership) => {
        const space = snapshot.spaces.find((item) => item.id === membership.spaceId)
        if (!space) {
          throw new MockApiError('RESOURCE_NOT_FOUND', 'Space not found for membership.')
        }
        return {
          space: this.toSpaceResource(space),
          membership: this.toMembershipResource(membership, snapshot),
          isSelected: snapshot.activeSpaceId === membership.spaceId,
        }
      })

    return { joinedSpaces }
  }

  async getAdminSpace(spaceId: string): Promise<SpaceDetailResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const space = snapshot.spaces.find((item) => item.publicId === spaceId)
    if (!space) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Space not found.')
    }
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertAdminMembership(membership)

    return {
      space: this.toSpaceResource(space),
      membership: this.toMembershipResource(membership, snapshot),
    }
  }

  async updateAdminSpace(spaceId: string, input: UpdateSpaceInput): Promise<SpaceDetailResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const space = snapshot.spaces.find((item) => item.publicId === spaceId)
    if (!space) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Space not found.')
    }

    await this.engine.updateSpaceSettings({
      name: input.name,
      description: input.description,
      joinPolicy: input.joinPolicy,
      spaceCode: input.spaceCode,
      maxOwnerCount: input.maxOwnerCount,
      whisperMaxLength: input.whisperMaxLength,
      locationGridMeters: input.locationGridMeters,
      locationJitterEnabled: input.locationJitterEnabled,
      whisperTtlMinutes: input.whisperTtlMinutes,
      whisperAutoHideReportThreshold: input.whisperAutoHideReportThreshold,
      whisperRateLimitPerMinute: input.whisperRateLimitPerMinute,
      whisperRateLimitPer10Min: input.whisperRateLimitPer10Min,
    })

    return this.getAdminSpace(spaceId)
  }

  async getJoinRequests(spaceId: string): Promise<AdminJoinRequestItem[]> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    return snapshot.memberships
      .filter((membership) => membership.spaceId === snapshot.activeSpaceId && membership.status === 'pending')
      .map((membership) => {
        const user = snapshot.users.find((item) => item.id === membership.userId)
        if (!user) {
          throw new MockApiError('RESOURCE_NOT_FOUND', 'User not found for pending membership.')
        }
        return {
          membership: this.toMembershipResource(membership, snapshot),
          user: this.toUserResource(user),
        }
      })
  }

  async approveMembership(membershipId: string, note?: string | null): Promise<MembershipResource> {
    const target = await this.findMembershipByPublicId(membershipId)
    await this.engine.setActiveSpace(target.spaceId)
    await this.engine.approveMembership(target.id, note ?? undefined)
    return this.getMembershipResource(membershipId)
  }

  async rejectMembership(membershipId: string, note?: string | null): Promise<MembershipResource> {
    const target = await this.findMembershipByPublicId(membershipId)
    await this.engine.setActiveSpace(target.spaceId)
    await this.engine.rejectMembership(target.id, note ?? undefined)
    return this.getMembershipResource(membershipId)
  }

  async getMembers(
    spaceId: string,
    query?: MemberListQuery,
  ): Promise<{ data: AdminMemberItem[]; meta: ApiListMeta }> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    const search = query?.search?.trim().toLowerCase()
    const items = snapshot.memberships
      .filter((membership) => membership.spaceId === snapshot.activeSpaceId)
      .filter((membership) => (query?.status ? mapMembershipStatus(membership.status) === query.status : true))
      .filter((membership) => (query?.role ? membership.role === query.role : true))
      .filter((membership) => {
        if (!search) {
          return true
        }
        const user = snapshot.users.find((item) => item.id === membership.userId)
        const haystack = `${membership.publicId} ${membership.role} ${membership.status} ${user?.displayName ?? ''} ${
          user?.email ?? ''
        }`.toLowerCase()
        return haystack.includes(search)
      })
      .map((membership) => {
        const user = snapshot.users.find((item) => item.id === membership.userId)
        if (!user) {
          throw new MockApiError('RESOURCE_NOT_FOUND', 'User not found for membership.')
        }
        return {
          membership: this.toMembershipResource(membership, snapshot),
          user: this.toUserResource(user),
        }
      })

    return {
      data: items,
      meta: {
        hasMore: false,
        nextCursor: null,
        limit: query?.limit ?? items.length,
      },
    }
  }

  async patchMembership(membershipId: string, input: PatchMembershipInput): Promise<MembershipResource> {
    const target = await this.findMembershipByPublicId(membershipId)
    await this.engine.setActiveSpace(target.spaceId)
    await this.engine.patchMembership({
      membershipId: target.id,
      role: input.role,
      status: input.status,
      suspendedUntil: input.suspendedUntil,
      muteUntil: input.muteUntil,
      reason: input.reason,
    })
    return this.getMembershipResource(membershipId)
  }

  async getAdminPosts(spaceId: string): Promise<{ data: PostResource[]; meta: ApiListMeta }> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    const items = snapshot.posts
      .filter((post) => post.spaceId === snapshot.activeSpaceId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((post) => this.toPostResource(post, snapshot))

    return {
      data: items,
      meta: {
        hasMore: false,
        nextCursor: null,
        limit: items.length,
      },
    }
  }

  async createAdminPost(spaceId: string, input: CreateOrUpdatePostInput): Promise<PostResource> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    this.assertAudienceInput(input.audienceType, input.recipientUserIds)
    await this.engine.createPost({
      title: input.title ?? '',
      body: input.body ?? '',
      notifyMembers: input.notifyMembers ?? false,
      publishNow: input.status === 'published',
    })

    const nextSnapshot = await this.engine.getSnapshot()
    const created = nextSnapshot.posts[0]
    if (!created) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Created post not found in mock state.')
    }

    if (input.status && input.status !== 'published' && input.status !== 'draft') {
      await this.engine.updatePost({
        postId: created.id,
        status: input.status,
        visibleFrom: input.visibleFrom,
        visibleTo: input.visibleTo,
      })
    }

    if (input.visibleFrom !== undefined || input.visibleTo !== undefined) {
      await this.engine.updatePost({
        postId: created.id,
        visibleFrom: input.visibleFrom,
        visibleTo: input.visibleTo,
      })
    }

    this.postConfigs.set(created.publicId, {
      category: 'owner',
      audienceType: input.audienceType ?? 'all_members',
      recipientUserIds: input.audienceType === 'targeted_users' ? [...(input.recipientUserIds ?? [])] : [],
    })

    return this.getPostResource(created.publicId)
  }

  async updateAdminPost(postId: string, input: CreateOrUpdatePostInput): Promise<PostResource> {
    const post = await this.findPostByPublicId(postId)
    await this.engine.setActiveSpace(post.spaceId)
    const currentConfig = this.getPostConfig(post.publicId)
    const nextAudienceType = input.audienceType ?? currentConfig.audienceType
    const nextRecipients = input.recipientUserIds ?? currentConfig.recipientUserIds
    this.assertAudienceInput(nextAudienceType, nextRecipients)
    await this.engine.updatePost({
      postId: post.id,
      title: input.title,
      body: input.body,
      status: input.status,
      notifyMembers: input.notifyMembers,
      visibleFrom: input.visibleFrom,
      visibleTo: input.visibleTo,
    })
    this.postConfigs.set(postId, {
      category: 'owner',
      audienceType: nextAudienceType,
      recipientUserIds: nextAudienceType === 'targeted_users' ? [...nextRecipients] : [],
    })
    return this.getPostResource(postId)
  }

  async publishAdminPost(postId: string, notifyMembers: boolean): Promise<PostResource> {
    const post = await this.findPostByPublicId(postId)
    await this.engine.setActiveSpace(post.spaceId)
    const config = this.getPostConfig(post.publicId)
    this.assertAudienceInput(config.audienceType, config.recipientUserIds)
    await this.engine.publishPost(post.id, notifyMembers)
    return this.getPostResource(postId)
  }

  async archiveAdminPost(postId: string): Promise<PostResource> {
    const post = await this.findPostByPublicId(postId)
    await this.engine.setActiveSpace(post.spaceId)
    await this.engine.archivePost(post.id)
    return this.getPostResource(postId)
  }

  async deleteAdminPost(postId: string): Promise<void> {
    const post = await this.findPostByPublicId(postId)
    await this.engine.setActiveSpace(post.spaceId)
    await this.engine.deletePost(post.id)
  }

  async getLiveThread(spaceId: string): Promise<LiveThreadStateResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertAdminMembership(membership)

    return this.buildLiveState(spaceId, membership, snapshot.activeSpaceId)
  }

  async getLiveStream(spaceId: string): Promise<LiveThreadStateResult> {
    return this.getLiveThread(spaceId)
  }

  async startLiveThread(spaceId: string): Promise<LiveThreadStateResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertPrimaryOwnerMembership(membership)

    if (!this.liveThreads.has(snapshot.activeSpaceId)) {
      const now = nowIso()
      this.liveThreads.set(snapshot.activeSpaceId, {
        id: `live_thread_${String(this.liveSequence).padStart(3, '0')}`,
        spaceId,
        status: 'active',
        startsAt: now,
        endsAt: null,
        createdAt: now,
        updatedAt: now,
      })
      this.liveSequence += 1
    }

    return this.buildLiveState(spaceId, membership, snapshot.activeSpaceId)
  }

  async closeLiveThread(spaceId: string): Promise<LiveThreadStateResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertPrimaryOwnerMembership(membership)

    const thread = this.liveThreads.get(snapshot.activeSpaceId) ?? null
    if (thread) {
      const now = nowIso()
      thread.status = 'closed'
      thread.endsAt = now
      thread.updatedAt = now
      this.liveStreams.delete(snapshot.activeSpaceId)
    }

    return this.buildLiveState(spaceId, membership, snapshot.activeSpaceId, thread, null)
  }

  async startLiveStream(spaceId: string): Promise<LiveStreamStartResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertPrimaryOwnerMembership(membership)

    if (!this.liveThreads.has(snapshot.activeSpaceId)) {
      await this.startLiveThread(spaceId)
    }

    if (!this.liveStreams.has(snapshot.activeSpaceId)) {
      this.liveStreams.set(snapshot.activeSpaceId, {
        id: `live_stream_${String(this.liveSequence).padStart(3, '0')}`,
        liveThreadId: this.liveThreads.get(snapshot.activeSpaceId)?.id ?? null,
        spaceId,
        status: 'live',
        isLive: true,
        playbackUrl: 'https://example.mock/live.m3u8',
        ingestEndpoint: 'rtmps://example.mock/app/',
        channelArn: 'arn:aws:ivs:ap-northeast-1:328125385782:channel/mock',
        startedAt: nowIso(),
        endedAt: null,
      })
      this.liveSequence += 1
    }

    return {
      ...this.buildLiveState(spaceId, membership, snapshot.activeSpaceId),
      broadcast: {
        streamKey: 'mock-stream-key',
        ingestEndpoint: 'rtmps://example.mock/app/',
        channelArn: 'arn:aws:ivs:ap-northeast-1:328125385782:channel/mock',
      },
    }
  }

  async endLiveStream(spaceId: string): Promise<LiveThreadStateResult> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    const membership = this.getCurrentSpaceMembership(snapshot)
    this.assertPrimaryOwnerMembership(membership)

    const stream = this.liveStreams.get(snapshot.activeSpaceId) ?? null
    if (stream) {
      stream.status = 'ended'
      stream.isLive = false
      stream.playbackUrl = null
      stream.endedAt = nowIso()
    }

    return this.buildLiveState(spaceId, membership, snapshot.activeSpaceId, undefined, stream)
  }

  async getWhispers(
    spaceId: string,
    query?: WhisperListQuery,
  ): Promise<{ data: WhisperResource[]; meta: Record<string, string | null> }> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    const activeWhispers = snapshot.whispers
      .filter((whisper) => whisper.spaceId === snapshot.activeSpaceId)
      .filter((whisper) => whisper.status === 'active')
      .filter((whisper) => new Date(whisper.expiresAt).getTime() > Date.now())
      .filter((whisper) => this.matchesWhisperBounds(whisper, query))
      .slice(0, query?.limit ?? Number.MAX_SAFE_INTEGER)
      .map((whisper) => this.toWhisperResource(whisper, snapshot))

    return {
      data: activeWhispers,
      meta: {
        expiresAtMin: activeWhispers[0]?.expiresAt ?? null,
        expiresAtMax: activeWhispers[activeWhispers.length - 1]?.expiresAt ?? null,
      },
    }
  }

  async getReports(
    spaceId: string,
    query?: ReportListQuery,
  ): Promise<{ data: AdminReportItem[]; meta: ApiListMeta }> {
    const snapshot = await this.getSnapshotForSpace(spaceId)
    this.assertAdminMembership(this.getCurrentSpaceMembership(snapshot))

    const items = snapshot.reports
      .filter((report) => report.spaceId === snapshot.activeSpaceId)
      .filter((report) => (query?.status ? report.status === query.status : true))
      .filter((report) => (query?.targetType ? report.targetType === query.targetType : true))
      .filter((report) => (query?.reasonType ? report.reasonType === query.reasonType : true))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((report) => this.toAdminReportItem(report, snapshot))

    return {
      data: items,
      meta: {
        hasMore: false,
        nextCursor: null,
        limit: query?.limit ?? items.length,
      },
    }
  }

  async resolveReport(reportId: string, input: ResolveReportInput): Promise<ReportResource> {
    const report = await this.findReportByPublicId(reportId)
    await this.engine.setActiveSpace(report.spaceId)
    await this.engine.resolveReport({
      reportId: report.id,
      status: 'resolved',
      resolutionType: input.resolutionType,
      note: input.note ?? '',
    })
    return this.getReportResource(reportId)
  }

  async removeWhisper(whisperId: string, reason?: string | null): Promise<WhisperResource> {
    const whisper = await this.findWhisperByPublicId(whisperId)
    await this.engine.setActiveSpace(whisper.spaceId)
    await this.engine.removeWhisper(whisper.id, reason ?? undefined)
    return this.getWhisperResource(whisperId)
  }

  async getNotificationSettings(): Promise<NotificationSettingsResource> {
    await this.getSessionSnapshot()
    return {
      enabled: true,
    }
  }

  async resetMock(): Promise<void> {
    await this.engine.reset()
    this.postConfigs.clear()
    if (this.token) {
      await this.restoreSession()
    }
  }

  private async getSessionSnapshot(): Promise<AdminSnapshot> {
    await this.restoreSession()
    return this.engine.getSnapshot()
  }

  private async getSnapshotForSpace(spaceId: string): Promise<AdminSnapshot> {
    const snapshot = await this.getSessionSnapshot()
    const space = snapshot.spaces.find((item) => item.publicId === spaceId)
    if (!space) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Space not found.')
    }
    await this.engine.setActiveSpace(space.id)
    return this.engine.getSnapshot()
  }

  private async restoreSession(): Promise<void> {
    if (!this.token) {
      throw new MockApiError('UNAUTHENTICATED', 'No stored mock session.')
    }

    const publicId = this.token.replace('mock-token:', '')
    const snapshot = await this.engine.getSnapshot()
    const user = snapshot.users.find((item) => item.publicId === publicId)
    if (!user) {
      throw new MockApiError('UNAUTHENTICATED', 'Mock session is invalid.')
    }

    await this.engine.setCurrentUser(user.id)
    const adminMembership =
      snapshot.memberships.find(
        (membership) =>
          membership.userId === user.id &&
          membership.status === 'active' &&
          (membership.role === 'owner' || membership.role === 'primary_owner'),
      ) ??
      snapshot.memberships.find((membership) => membership.userId === user.id)

    if (adminMembership) {
      await this.engine.setActiveSpace(adminMembership.spaceId)
    }
  }

  private async getMembershipResource(membershipPublicId: string): Promise<MembershipResource> {
    const snapshot = await this.engine.getSnapshot()
    const membership = snapshot.memberships.find((item) => item.publicId === membershipPublicId)
    if (!membership) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Membership not found.')
    }
    return this.toMembershipResource(membership, snapshot)
  }

  private async getPostResource(postPublicId: string): Promise<PostResource> {
    const snapshot = await this.engine.getSnapshot()
    const post = snapshot.posts.find((item) => item.publicId === postPublicId)
    if (!post) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Post not found.')
    }
    return this.toPostResource(post, snapshot)
  }

  private async getWhisperResource(whisperPublicId: string): Promise<WhisperResource> {
    const snapshot = await this.engine.getSnapshot()
    const whisper = snapshot.whispers.find((item) => item.publicId === whisperPublicId)
    if (!whisper) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Whisper not found.')
    }
    return this.toWhisperResource(whisper, snapshot)
  }

  private async getReportResource(reportPublicId: string): Promise<ReportResource> {
    const snapshot = await this.engine.getSnapshot()
    const report = snapshot.reports.find((item) => item.publicId === reportPublicId)
    if (!report) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Report not found.')
    }
    return this.toReportResource(report, snapshot)
  }

  private async findMembershipByPublicId(membershipPublicId: string): Promise<SpaceMembership> {
    const snapshot = await this.getSessionSnapshot()
    const membership = snapshot.memberships.find((item) => item.publicId === membershipPublicId)
    if (!membership) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Membership not found.')
    }
    return membership
  }

  private async findPostByPublicId(postPublicId: string): Promise<SpacePost> {
    const snapshot = await this.getSessionSnapshot()
    const post = snapshot.posts.find((item) => item.publicId === postPublicId)
    if (!post) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Post not found.')
    }
    return post
  }

  private async findWhisperByPublicId(whisperPublicId: string): Promise<MapWhisper> {
    const snapshot = await this.getSessionSnapshot()
    const whisper = snapshot.whispers.find((item) => item.publicId === whisperPublicId)
    if (!whisper) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Whisper not found.')
    }
    return whisper
  }

  private async findReportByPublicId(reportPublicId: string): Promise<ContentReport> {
    const snapshot = await this.getSessionSnapshot()
    const report = snapshot.reports.find((item) => item.publicId === reportPublicId)
    if (!report) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Report not found.')
    }
    return report
  }

  private getCurrentSpaceMembership(snapshot: AdminSnapshot): SpaceMembership {
    const membership = snapshot.memberships.find(
      (item) => item.spaceId === snapshot.activeSpaceId && item.userId === snapshot.currentUserId,
    )
    if (!membership) {
      throw new MockApiError('FORBIDDEN', 'Current user does not belong to selected space.')
    }
    return membership
  }

  private assertAdminMembership(membership: SpaceMembership): void {
    if (membership.status !== 'active' || (membership.role !== 'owner' && membership.role !== 'primary_owner')) {
      throw new MockApiError('FORBIDDEN', 'Selected space is not admin-accessible for current user.')
    }
  }

  private assertPrimaryOwnerMembership(membership: SpaceMembership): void {
    this.assertAdminMembership(membership)
    if (membership.role !== 'primary_owner') {
      throw new MockApiError('FORBIDDEN', 'プライマリオーナーのみ実行できます。')
    }
  }

  private matchesWhisperBounds(whisper: MapWhisper, query?: WhisperListQuery): boolean {
    if (!query) {
      return true
    }
    if (query.south !== undefined && whisper.displayLat < query.south) {
      return false
    }
    if (query.north !== undefined && whisper.displayLat > query.north) {
      return false
    }
    if (query.west !== undefined && whisper.displayLng < query.west) {
      return false
    }
    if (query.east !== undefined && whisper.displayLng > query.east) {
      return false
    }
    return true
  }

  private toUserResource(user: User): UserResource {
    return {
      id: user.publicId,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: user.createdAt,
    }
  }

  private toSpaceResource(space: Space): SpaceResource {
    return {
      id: space.publicId,
      code: space.spaceCode,
      name: space.name,
      description: space.description,
      joinPolicy: space.joinPolicy,
      status: space.status,
      maxOwnerCount: space.maxOwnerCount,
      whisperTtlMinutes: space.whisperTtlMinutes,
      whisperMaxLength: space.whisperMaxLength,
      locationGridMeters: space.locationGridMeters,
      locationJitterEnabled: space.locationJitterEnabled,
      whisperAutoHideReportThreshold: space.whisperAutoHideReportThreshold,
      whisperRateLimitPerMinute: space.whisperRateLimitPerMinute,
      whisperRateLimitPer10Min: space.whisperRateLimitPer10Min,
      createdAt: space.createdAt,
    }
  }

  private toMembershipResource(membership: SpaceMembership, snapshot: AdminSnapshot): MembershipResource {
    const space = snapshot.spaces.find((item) => item.id === membership.spaceId)
    const user = snapshot.users.find((item) => item.id === membership.userId)
    if (!space || !user) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Membership references missing space or user.')
    }

    return {
      id: membership.publicId,
      spaceId: space.publicId,
      userId: user.publicId,
      role: membership.role,
      status: mapMembershipStatus(membership.status),
      joinedAt: membership.joinedAt,
      approvedAt: membership.approvedAt,
      leftAt: membership.leftAt,
      kickedAt: membership.kickedAt,
      bannedAt: membership.bannedAt,
      suspendedUntil: membership.suspendedUntil,
      muteUntil: membership.muteUntil,
      lastSeenAt: membership.lastSeenAt,
      createdAt: membership.createdAt,
    }
  }

  private toPostResource(post: SpacePost, snapshot: AdminSnapshot): PostResource {
    const space = snapshot.spaces.find((item) => item.id === post.spaceId)
    const currentMembership = this.getCurrentSpaceMembership(snapshot)
    if (!space) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Space not found for post.')
    }

    const reactions = snapshot.postReactions.filter((item) => item.postId === post.id)

    const config = this.getPostConfig(post.publicId)
    return {
      id: post.publicId,
      spaceId: space.publicId,
      authorMembershipId: snapshot.memberships.find((item) => item.id === post.authorMembershipId)?.publicId ?? '',
      category: config.category,
      audienceType: config.audienceType,
      title: post.title,
      body: post.body,
      status: post.status,
      notifyMembers: post.notifyMembers,
      publishedAt: post.publishedAt,
      visibleFrom: post.visibleFrom,
      visibleTo: post.visibleTo,
      reactionCount: reactions.length,
      reactedByMe: reactions.some((item) => item.membershipId === currentMembership.id),
      isRead: false,
      readAt: null,
      targetedToMe: false,
      recipientUserIds: config.recipientUserIds,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }
  }

  private buildLiveState(
    publicSpaceId: string,
    membership: SpaceMembership,
    internalSpaceId: number,
    threadOverride?: LiveThreadResource | null,
    streamOverride?: LiveStreamResource | null,
  ): LiveThreadStateResult {
    const thread = threadOverride === undefined ? (this.liveThreads.get(internalSpaceId) ?? null) : threadOverride
    const stream =
      streamOverride === undefined
        ? (this.liveStreams.get(internalSpaceId) ?? {
            id: null,
            liveThreadId: null,
            spaceId: null,
            status: 'idle',
            isLive: false,
            playbackUrl: null,
            startedAt: null,
            endedAt: null,
          })
        : (streamOverride ?? {
            id: null,
            liveThreadId: null,
            spaceId: null,
            status: 'idle',
            isLive: false,
            playbackUrl: null,
            startedAt: null,
            endedAt: null,
          })

    const permissions: LivePermissionsResource = {
      canWatch: membership.status === 'active' && thread?.status === 'active',
      canComment: membership.status === 'active' && thread?.status === 'active',
      canStartThread:
        membership.status === 'active' &&
        membership.role === 'primary_owner' &&
        thread?.status !== 'active',
      canCloseThread: membership.status === 'active' && membership.role === 'primary_owner' && thread?.status === 'active',
      canStartStream:
        membership.status === 'active' &&
        membership.role === 'primary_owner' &&
        thread?.status === 'active' &&
        stream.status !== 'live',
      canEndStream: membership.status === 'active' && membership.role === 'primary_owner' && stream.status === 'live',
      isPrimaryOwner: membership.role === 'primary_owner',
    }

    return {
      liveThread: thread,
      liveStream: stream,
      permissions,
      chatPolicy: {
        roomId: 'mock-room',
        endpoint: 'wss://edge.ivschat.ap-northeast-1.amazonaws.com',
        messageMaxLength: 30,
        cooldownSeconds: 3,
      },
      spaceId: publicSpaceId,
    }
  }

  private getPostConfig(postPublicId: string): {
    category: 'owner'
    audienceType: 'all_members' | 'targeted_users'
    recipientUserIds: string[]
  } {
    return (
      this.postConfigs.get(postPublicId) ?? {
        category: 'owner',
        audienceType: 'all_members',
        recipientUserIds: [],
      }
    )
  }

  private assertAudienceInput(
    audienceType: 'all_members' | 'targeted_users' | undefined,
    recipientUserIds: string[] | undefined,
  ): void {
    if (audienceType !== 'targeted_users') {
      return
    }

    if (!recipientUserIds || recipientUserIds.length === 0) {
      throw new MockApiError('VALIDATION_ERROR', '配信先アカウントを1件以上選択してください。')
    }
  }

  private toWhisperResource(whisper: MapWhisper, snapshot: AdminSnapshot): WhisperResource {
    return {
      id: whisper.publicId,
      spaceId: snapshot.spaces.find((item) => item.id === whisper.spaceId)?.publicId ?? '',
      membershipId: snapshot.memberships.find((item) => item.id === whisper.membershipId)?.publicId ?? '',
      body: whisper.body,
      status: whisper.status,
      displayLat: whisper.displayLat,
      displayLng: whisper.displayLng,
      displayRadiusM: whisper.displayRadiusM,
      expiresAt: whisper.expiresAt,
      reportCount: whisper.reportCount,
      image: null,
      createdAt: whisper.createdAt,
    }
  }

  private toReportResource(report: ContentReport, snapshot: AdminSnapshot): ReportResource {
    const space = snapshot.spaces.find((item) => item.id === report.spaceId)
    const reporter = snapshot.memberships.find((item) => item.id === report.reporterMembershipId)
    if (!space || !reporter) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Report references missing space or reporter.')
    }

    let targetId = String(report.targetId)
    if (report.targetType === 'whisper') {
      targetId = snapshot.whispers.find((item) => item.id === report.targetId)?.publicId ?? targetId
    } else if (report.targetType === 'post') {
      targetId = snapshot.posts.find((item) => item.id === report.targetId)?.publicId ?? targetId
    } else if (report.targetType === 'member') {
      targetId = snapshot.memberships.find((item) => item.id === report.targetId)?.publicId ?? targetId
    }

    return {
      id: report.publicId,
      spaceId: space.publicId,
      reporterMembershipId: reporter.publicId,
      targetType: report.targetType,
      targetId,
      reasonType: report.reasonType,
      detail: report.detail || null,
      status: report.status,
      handledByMembershipId:
        snapshot.memberships.find((item) => item.id === report.handledByMembershipId)?.publicId ?? null,
      handledAt: report.handledAt,
      resolutionType: report.resolutionType,
      createdAt: report.createdAt,
    }
  }

  private toAdminReportItem(report: ContentReport, snapshot: AdminSnapshot): AdminReportItem {
    const reporterMembership = snapshot.memberships.find((item) => item.id === report.reporterMembershipId)
    const reporterUser = snapshot.users.find((item) => item.id === reporterMembership?.userId)
    if (!reporterMembership || !reporterUser) {
      throw new MockApiError('RESOURCE_NOT_FOUND', 'Reporter not found for report.')
    }

    const whisper =
      report.targetType === 'whisper'
        ? snapshot.whispers.find((item) => item.id === report.targetId)
        : undefined

    return {
      report: this.toReportResource(report, snapshot),
      target: {
        type: 'whisper',
        whisper: whisper ? this.toWhisperResource(whisper, snapshot) : undefined,
      },
      reporter: {
        membership: this.toMembershipResource(reporterMembership, snapshot),
        user: this.toUserResource(reporterUser),
      },
    }
  }
}
