import type { ApiListMeta, ResolutionType } from '../../types/api'
import { getAppStorage } from '../../utils/storage'
import { createInitialSystemAdminState } from '../data/mockSystemAdminData'
import type {
  SystemAdminPostItem,
  SystemAdminAuthResult,
  SystemLiveSummary,
  SystemAdminMeResult,
  SystemAuditLog,
  SystemDashboardMetrics,
  SystemReportSummary,
  SystemSpaceCreationRequestSummary,
  SystemSpaceResource,
  SystemSpaceSummary,
  SystemUserSummary,
} from '../types'
import type {
  AssignPrimaryOwnerInput,
  CreateSystemSpaceInput,
  CreateOrUpdateSystemPostInput,
  PatchSystemSpaceInput,
  PatchSystemUserInput,
  ReviewSpaceCreationRequestInput,
  ResolveSystemReportInput,
  SystemAdminLoginInput,
  SystemLiveListQuery,
  SystemAdminService,
  SystemPostListQuery,
  SystemReportListQuery,
  SystemSpaceCreationRequestListQuery,
  SystemSpaceListQuery,
  SystemUserListQuery,
} from './systemAdminService'

const TOKEN_KEY = 'noccaro.system-admin.token'
const MOCK_PASSWORD = 'password123'
const storage = getAppStorage()

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeSearch(value?: string): string {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeSpaceCode(value: string): string {
  return value.trim().toUpperCase()
}

function listMeta<T>(items: T[], limit?: number): ApiListMeta {
  return {
    hasMore: false,
    nextCursor: null,
    limit: limit ?? items.length,
  }
}

export class SystemAdminApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SystemAdminApiError'
    this.code = code
  }
}

export class MockSystemAdminService implements SystemAdminService {
  readonly mode = 'mock' as const

  private state = createInitialSystemAdminState()
  private token = storage.getItem(TOKEN_KEY)

  hasStoredSession(): boolean {
    return Boolean(this.token)
  }

  async login(input: SystemAdminLoginInput): Promise<SystemAdminAuthResult> {
    if (input.password !== MOCK_PASSWORD) {
      throw new SystemAdminApiError('UNAUTHENTICATED', 'ログイン情報を確認してください。')
    }

    const admin = this.state.admins.find((item) => item.email === input.email)
    if (!admin) {
      throw new SystemAdminApiError('FORBIDDEN', 'システム管理者ではありません。')
    }

    this.state.currentAdminId = admin.id
    this.token = `system-admin-token:${admin.id}`
    storage.setItem(TOKEN_KEY, this.token)

    return {
      token: this.token,
      user: cloneValue(this.state.admins.find((item) => item.id === admin.id)!),
    }
  }

  async logout(): Promise<void> {
    this.state.currentAdminId = null
    this.token = null
    storage.removeItem(TOKEN_KEY)
  }

  async getMe(): Promise<SystemAdminMeResult> {
    return {
      user: this.requireCurrentAdmin(),
    }
  }

  async getDashboard(): Promise<SystemDashboardMetrics> {
    this.requireCurrentAdmin()
    return this.buildDashboardMetrics()
  }

  async getSpaces(query?: SystemSpaceListQuery): Promise<{ data: SystemSpaceSummary[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const search = normalizeSearch(query?.search)
    const items = this.state.spaces
      .map((record) => this.toSpaceSummary(record.space.id))
      .filter((item) => (query?.status && query.status !== 'all' ? item.space.status === query.status : true))
      .filter((item) => {
        if (!search) {
          return true
        }
        const haystack = `${item.space.name} ${item.space.code} ${item.primaryOwner.displayName ?? ''} ${item.primaryOwner.email ?? ''}`.toLowerCase()
        return haystack.includes(search)
      })
      .sort((left, right) => right.space.createdAt.localeCompare(left.space.createdAt))

    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async getSpaceCreationRequests(
    query?: SystemSpaceCreationRequestListQuery,
  ): Promise<{ data: SystemSpaceCreationRequestSummary[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const search = normalizeSearch(query?.search)
    const items = this.state.creationRequests
      .filter((item) => (query?.status && query.status !== 'all' ? item.request.status === query.status : true))
      .filter((item) => {
        if (!search) {
          return true
        }
        const haystack = `${item.request.spaceName} ${item.request.spaceCode} ${item.requester?.displayName ?? ''} ${item.requester?.email ?? ''}`.toLowerCase()
        return haystack.includes(search)
      })
      .sort((left, right) => right.request.updatedAt.localeCompare(left.request.updatedAt))
      .map((item) => cloneValue(item))

    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async approveSpaceCreationRequest(
    requestId: string,
    input?: ReviewSpaceCreationRequestInput,
  ): Promise<SystemSpaceCreationRequestSummary> {
    this.requireCurrentAdmin()
    const request = this.findCreationRequest(requestId)
    if (request.request.status !== 'pending') {
      throw new SystemAdminApiError('CONFLICT', 'この作成申請はすでに処理済みです。')
    }

    const requester = request.requester
    if (!requester || requester.status !== 'active') {
      throw new SystemAdminApiError('CONFLICT', '申請者が無効なため承認できません。')
    }

    const spaceCode = normalizeSpaceCode(request.request.spaceCode)
    if (this.state.spaces.some((item) => item.space.code === spaceCode)) {
      throw new SystemAdminApiError('SPACE_CODE_ALREADY_TAKEN', 'このスペースコードはすでに使用されています。')
    }

    const spaceId = `space_${String(this.state.nextSpaceSequence).padStart(3, '0')}`
    this.state.nextSpaceSequence += 1
    const membershipId = `membership_space_${String(this.state.nextMembershipSequence).padStart(3, '0')}_primary`
    this.state.nextMembershipSequence += 1
    const createdAt = nowIso()

    const space: SystemSpaceResource = {
      id: spaceId,
      code: spaceCode,
      name: request.request.spaceName,
      description: '',
      joinPolicy: request.request.joinPolicy,
      status: 'active',
      maxOwnerCount: 3,
      whisperTtlMinutes: 180,
      whisperMaxLength: 20,
      locationGridMeters: 120,
      locationJitterEnabled: true,
      createdAt,
    }

    this.state.spaces.unshift({
      space,
      primaryOwner: {
        membershipId,
        userId: requester.id,
        displayName: requester.displayName,
        email: requester.email,
      },
    })

    const requesterSummary = this.state.users.find((item) => item.user.id === requester.id)
    requesterSummary?.memberships.unshift({
      membershipId,
      spaceId,
      spaceName: space.name,
      role: 'primary_owner',
      status: 'active',
    })

    request.request.status = 'approved'
    request.request.createdSpaceId = spaceId
    request.request.updatedAt = createdAt
    request.createdSpace = {
      id: spaceId,
      code: space.code,
      name: space.name,
    }
    request.reviewedBy = this.requireCurrentAdmin()
    request.reviewedAt = createdAt
    request.approvedAt = createdAt
    request.rejectedAt = null
    request.request.rejectionVisibleUntil = null

    this.addAuditLog(
      'space_creation_request_approved',
      'space_creation_request',
      requestId,
      `${request.request.spaceName} (${spaceCode}) の作成申請を承認しました。${input?.note ? ` (${input.note})` : ''}`,
    )

    return cloneValue(request)
  }

  async rejectSpaceCreationRequest(
    requestId: string,
    input?: ReviewSpaceCreationRequestInput,
  ): Promise<SystemSpaceCreationRequestSummary> {
    this.requireCurrentAdmin()
    const request = this.findCreationRequest(requestId)
    if (request.request.status !== 'pending') {
      throw new SystemAdminApiError('CONFLICT', 'この作成申請はすでに処理済みです。')
    }

    const reviewedAt = nowIso()
    const rejectionVisibleUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    request.request.status = 'rejected'
    request.request.updatedAt = reviewedAt
    request.request.rejectionVisibleUntil = rejectionVisibleUntil
    request.reviewedBy = this.requireCurrentAdmin()
    request.reviewedAt = reviewedAt
    request.approvedAt = null
    request.rejectedAt = reviewedAt

    this.addAuditLog(
      'space_creation_request_rejected',
      'space_creation_request',
      requestId,
      `${request.request.spaceName} (${request.request.spaceCode}) の作成申請を棄却しました。${input?.note ? ` (${input.note})` : ''}`,
    )

    return cloneValue(request)
  }

  async createSpace(input: CreateSystemSpaceInput): Promise<SystemSpaceSummary> {
    this.requireCurrentAdmin()

    const targetUser = this.state.users.find((item) => item.user.id === input.initialPrimaryOwnerUserId)
    if (!targetUser) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '初期主オーナーのユーザーが見つかりません。')
    }

    if (targetUser.user.status !== 'active') {
      throw new SystemAdminApiError('CONFLICT', 'ロック中または無効なユーザーは主オーナーに設定できません。')
    }

    const normalizedSpaceCode = normalizeSpaceCode(input.spaceCode)

    if (this.state.spaces.some((item) => item.space.code === normalizedSpaceCode)) {
      throw new SystemAdminApiError('SPACE_CODE_ALREADY_TAKEN', '同じスペースコードは使用できません。')
    }

    if (this.state.creationRequests.some((item) => item.request.status === 'pending' && item.request.spaceCode === normalizedSpaceCode)) {
      throw new SystemAdminApiError('SPACE_CODE_ALREADY_RESERVED', '同じスペースコードは申請中のため使用できません。')
    }

    const spaceId = `space_${String(this.state.nextSpaceSequence).padStart(3, '0')}`
    this.state.nextSpaceSequence += 1

    const membershipId = `membership_space_${String(this.state.nextMembershipSequence).padStart(3, '0')}_primary`
    this.state.nextMembershipSequence += 1

    const createdAt = nowIso()
    const space: SystemSpaceResource = {
      id: spaceId,
      code: normalizedSpaceCode,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      joinPolicy: input.joinPolicy,
      status: 'active',
      maxOwnerCount: input.maxOwnerCount,
      whisperTtlMinutes: input.whisperTtlMinutes,
      whisperMaxLength: input.whisperMaxLength,
      locationGridMeters: input.locationGridMeters,
      locationJitterEnabled: input.locationJitterEnabled,
      createdAt,
    }

    this.state.spaces.unshift({
      space,
      primaryOwner: {
        membershipId,
        userId: targetUser.user.id,
        displayName: targetUser.user.displayName,
        email: targetUser.user.email,
      },
    })

    targetUser.memberships.unshift({
      membershipId,
      spaceId,
      spaceName: space.name,
      role: 'primary_owner',
      status: 'active',
    })

    this.addAuditLog('space_created', 'space', spaceId, `${space.name} を作成し、主オーナーを設定しました。`)

    return this.toSpaceSummary(spaceId)
  }

  async patchSpace(spaceId: string, input: PatchSystemSpaceInput): Promise<SystemSpaceResource> {
    this.requireCurrentAdmin()
    const record = this.findSpaceRecord(spaceId)

    record.space.name = input.name?.trim() || record.space.name
    record.space.description = input.description === undefined ? record.space.description : input.description?.trim() || null
    if (input.spaceCode) {
      const normalizedSpaceCode = normalizeSpaceCode(input.spaceCode)
      if (this.state.spaces.some((item) => item.space.id !== spaceId && item.space.code === normalizedSpaceCode)) {
        throw new SystemAdminApiError('SPACE_CODE_ALREADY_TAKEN', '同じスペースコードは使用できません。')
      }
      if (
        this.state.creationRequests.some(
          (item) => item.request.status === 'pending' && item.request.spaceCode === normalizedSpaceCode,
        )
      ) {
        throw new SystemAdminApiError('SPACE_CODE_ALREADY_RESERVED', '同じスペースコードは申請中のため使用できません。')
      }
      record.space.code = normalizedSpaceCode
    }
    record.space.joinPolicy = input.joinPolicy ?? record.space.joinPolicy
    record.space.status = input.status ?? record.space.status

    this.state.users.forEach((item) => {
      item.memberships.forEach((membership) => {
        if (membership.spaceId === spaceId) {
          membership.spaceName = record.space.name
        }
      })
    })

    this.addAuditLog('space_updated', 'space', spaceId, `${record.space.name} の設定を更新しました。`)

    return cloneValue(record.space)
  }

  async assignPrimaryOwner(spaceId: string, input: AssignPrimaryOwnerInput): Promise<SystemSpaceSummary> {
    this.requireCurrentAdmin()
    const record = this.findSpaceRecord(spaceId)
    const targetUser = this.state.users.find((item) => item.user.id === input.userId)
    if (!targetUser) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '対象ユーザーが見つかりません。')
    }

    if (targetUser.user.status !== 'active') {
      throw new SystemAdminApiError('CONFLICT', 'ロック中または無効なユーザーは主オーナーに設定できません。')
    }

    if (record.primaryOwner.userId && record.primaryOwner.userId !== targetUser.user.id) {
      const previousUser = this.state.users.find((item) => item.user.id === record.primaryOwner.userId)
      const previousMembership = previousUser?.memberships.find((item) => item.spaceId === spaceId)
      if (previousMembership) {
        previousMembership.role = 'owner'
      }
    }

    let targetMembership = targetUser.memberships.find((item) => item.spaceId === spaceId)
    if (!targetMembership) {
      targetMembership = {
        membershipId: `membership_space_${String(this.state.nextMembershipSequence).padStart(3, '0')}_primary`,
        spaceId,
        spaceName: record.space.name,
        role: 'primary_owner',
        status: 'active',
      }
      this.state.nextMembershipSequence += 1
      targetUser.memberships.unshift(targetMembership)
    }

    targetMembership.role = 'primary_owner'
    targetMembership.status = 'active'
    targetMembership.spaceName = record.space.name

    record.primaryOwner = {
      membershipId: targetMembership.membershipId,
      userId: targetUser.user.id,
      displayName: targetUser.user.displayName,
      email: targetUser.user.email,
    }

    this.addAuditLog(
      'primary_owner_assigned',
      'membership',
      targetMembership.membershipId,
      `${record.space.name} の主オーナーを ${targetUser.user.displayName} に設定しました。${input.note ? ` (${input.note})` : ''}`,
    )

    return this.toSpaceSummary(spaceId)
  }

  async getSpacePosts(
    spaceId: string,
    query?: SystemPostListQuery,
  ): Promise<{ data: SystemAdminPostItem[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    this.findSpaceRecord(spaceId)

    const category = query?.category ?? 'all'
    const items = this.state.posts
      .filter((item) => item.post.spaceId === spaceId)
      .filter((item) => (category === 'all' ? true : item.post.category === category))
      .sort((left, right) => right.post.updatedAt.localeCompare(left.post.updatedAt))
      .map((item) => cloneValue(item))

    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async createSpacePost(spaceId: string, input: CreateOrUpdateSystemPostInput): Promise<SystemAdminPostItem> {
    const admin = this.requireCurrentAdmin()
    const space = this.findSpaceRecord(spaceId).space
    const audienceType = input.audienceType ?? 'all_members'
    const recipients = this.resolveRecipientUserIds(spaceId, audienceType, input.recipientUserIds ?? [])
    const publishedNow = input.status === 'published'
    const createdAt = nowIso()

    const item: SystemAdminPostItem = {
      post: {
        id: `sys_post_${String(this.state.nextPostSequence).padStart(3, '0')}`,
        spaceId,
        authorMembershipId: this.resolveAuthorMembershipId(spaceId),
        category: 'operation',
        audienceType,
        title: input.title?.trim() ?? '',
        body: input.body?.trim() ?? '',
        status: input.status ?? 'draft',
        notifyMembers: Boolean(input.notifyMembers),
        publishedAt: publishedNow ? createdAt : null,
        visibleFrom: input.visibleFrom ?? null,
        visibleTo: input.visibleTo ?? null,
        reactionCount: 0,
        reactedByMe: false,
        isRead: false,
        readAt: null,
        targetedToMe: false,
        recipientUserIds: recipients,
        createdAt,
        updatedAt: createdAt,
      },
      createdBySystemAdmin: admin,
    }

    if (!item.post.title || !item.post.body) {
      throw new SystemAdminApiError('VALIDATION_ERROR', 'タイトルと本文は必須です。')
    }

    this.state.nextPostSequence += 1
    this.state.posts.unshift(item)
    this.addAuditLog('system_post_created', 'space', spaceId, `${space.name} に運営お知らせを作成しました。`)

    return cloneValue(item)
  }

  async updateSpacePost(postId: string, input: CreateOrUpdateSystemPostInput): Promise<SystemAdminPostItem> {
    const postItem = this.findPostItem(postId)
    const audienceType = input.audienceType ?? postItem.post.audienceType
    const recipients = this.resolveRecipientUserIds(
      postItem.post.spaceId,
      audienceType,
      input.recipientUserIds ?? postItem.post.recipientUserIds ?? [],
    )

    postItem.post = {
      ...postItem.post,
      title: input.title?.trim() ?? postItem.post.title,
      body: input.body?.trim() ?? postItem.post.body,
      status: input.status ?? postItem.post.status,
      audienceType,
      recipientUserIds: recipients,
      notifyMembers: input.notifyMembers ?? postItem.post.notifyMembers,
      visibleFrom: input.visibleFrom === undefined ? postItem.post.visibleFrom : input.visibleFrom,
      visibleTo: input.visibleTo === undefined ? postItem.post.visibleTo : input.visibleTo,
      updatedAt: nowIso(),
    }

    if (postItem.post.status === 'published' && !postItem.post.publishedAt) {
      postItem.post.publishedAt = nowIso()
    }

    this.addAuditLog('system_post_updated', 'space', postItem.post.spaceId, `${postItem.post.title} を更新しました。`)

    return cloneValue(postItem)
  }

  async publishSpacePost(postId: string, notifyMembers: boolean): Promise<SystemAdminPostItem> {
    const postItem = this.findPostItem(postId)
    postItem.post.status = 'published'
    postItem.post.notifyMembers = notifyMembers
    postItem.post.publishedAt = postItem.post.publishedAt ?? nowIso()
    postItem.post.updatedAt = nowIso()
    this.addAuditLog('system_post_published', 'space', postItem.post.spaceId, `${postItem.post.title} を公開しました。`)

    return cloneValue(postItem)
  }

  async archiveSpacePost(postId: string): Promise<SystemAdminPostItem> {
    const postItem = this.findPostItem(postId)
    postItem.post.status = 'archived'
    postItem.post.updatedAt = nowIso()
    this.addAuditLog('system_post_archived', 'space', postItem.post.spaceId, `${postItem.post.title} をアーカイブしました。`)

    return cloneValue(postItem)
  }

  async deleteSpacePost(postId: string): Promise<void> {
    const postItem = this.findPostItem(postId)
    this.state.posts = this.state.posts.filter((item) => item.post.id !== postId)
    this.addAuditLog('system_post_deleted', 'space', postItem.post.spaceId, `${postItem.post.title} を削除しました。`)
  }

  async getUsers(query?: SystemUserListQuery): Promise<{ data: SystemUserSummary[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const search = normalizeSearch(query?.search)
    const items = this.state.users
      .filter((item) => (query?.status && query.status !== 'all' ? item.user.status === query.status : true))
      .filter((item) => {
        if (!search) {
          return true
        }
        const haystack = `${item.user.displayName} ${item.user.email} ${item.user.id}`.toLowerCase()
        return haystack.includes(search)
      })
      .sort((left, right) => left.user.displayName.localeCompare(right.user.displayName, 'ja'))
      .map((item) => cloneValue(item))

    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async patchUser(userId: string, input: PatchSystemUserInput): Promise<SystemUserSummary> {
    this.requireCurrentAdmin()
    const record = this.state.users.find((item) => item.user.id === userId)
    if (!record) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '対象ユーザーが見つかりません。')
    }

    record.user.status = input.status
    this.addAuditLog(
      'user_status_updated',
      'user',
      userId,
      `${record.user.displayName} のステータスを ${input.status} に変更しました。${input.note ? ` (${input.note})` : ''}`,
    )

    return cloneValue(record)
  }

  async getReports(query?: SystemReportListQuery): Promise<{ data: SystemReportSummary[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const items = this.state.reports
      .filter((item) => (query?.status && query.status !== 'all' ? item.report.status === query.status : true))
      .filter((item) => (query?.reasonType && query.reasonType !== 'all' ? item.report.reasonType === query.reasonType : true))
      .filter((item) => (query?.spaceId ? item.report.spaceId === query.spaceId : true))
      .sort((left, right) => right.report.createdAt.localeCompare(left.report.createdAt))
      .map((item) => cloneValue(item))

    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async resolveReport(reportId: string, input: ResolveSystemReportInput): Promise<SystemReportSummary> {
    this.requireCurrentAdmin()
    const record = this.state.reports.find((item) => item.report.id === reportId)
    if (!record) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '通報が見つかりません。')
    }

    record.report.status = 'resolved'
    record.report.resolutionType = input.resolutionType
    record.report.handledAt = nowIso()

    this.addAuditLog(
      'report_resolved',
      'report',
      reportId,
      `${record.space.name} の通報を ${this.resolutionLabel(input.resolutionType)} として処理しました。${input.note ? ` (${input.note})` : ''}`,
    )

    return cloneValue(record)
  }

  async getAuditLogs(): Promise<{ data: SystemAuditLog[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const items = [...this.state.auditLogs]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => cloneValue(item))
    return {
      data: items,
      meta: listMeta(items),
    }
  }

  async getLiveThreads(query?: SystemLiveListQuery): Promise<{ data: SystemLiveSummary[]; meta: ApiListMeta }> {
    this.requireCurrentAdmin()
    const items: SystemLiveSummary[] = []
    return {
      data: items,
      meta: listMeta(items, query?.limit),
    }
  }

  async forceCloseLiveThread(spaceId: string): Promise<SystemLiveSummary> {
    this.requireCurrentAdmin()
    const summary = this.toSpaceSummary(spaceId)
    return {
      space: summary.space,
      primaryOwner: summary.primaryOwner,
      liveThread: null,
      liveStream: {
        id: null,
        liveThreadId: null,
        spaceId: null,
        status: 'idle',
        isLive: false,
        playbackUrl: null,
        startedAt: null,
        endedAt: null,
      },
    }
  }

  async forceEndLiveStream(spaceId: string): Promise<SystemLiveSummary> {
    return this.forceCloseLiveThread(spaceId)
  }

  async resetMock(): Promise<void> {
    this.state = createInitialSystemAdminState()
    if (this.token) {
      this.state.currentAdminId = this.state.admins[0]?.id ?? null
    }
  }

  private requireCurrentAdmin() {
    if (!this.token || !this.state.currentAdminId) {
      throw new SystemAdminApiError('UNAUTHENTICATED', 'システム管理者としてログインしてください。')
    }

    const admin = this.state.admins.find((item) => item.id === this.state.currentAdminId)
    if (!admin) {
      throw new SystemAdminApiError('UNAUTHENTICATED', 'システム管理者セッションが無効です。')
    }

    return cloneValue(admin)
  }

  private findSpaceRecord(spaceId: string) {
    const record = this.state.spaces.find((item) => item.space.id === spaceId)
    if (!record) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', 'スペースが見つかりません。')
    }
    return record
  }

  private toSpaceSummary(spaceId: string): SystemSpaceSummary {
    const record = this.findSpaceRecord(spaceId)
    const memberships = this.state.users.flatMap((item) => item.memberships.filter((membership) => membership.spaceId === spaceId))
    const openReportCount = this.state.reports.filter((item) => item.report.spaceId === spaceId && item.report.status === 'open').length

    return {
      space: cloneValue(record.space),
      primaryOwner: cloneValue(record.primaryOwner),
      metrics: {
        memberCount: memberships.filter((item) => item.status !== 'left').length,
        pendingCount: memberships.filter((item) => item.status === 'pending').length,
        ownerCount: memberships.filter(
          (item) => item.status === 'active' && (item.role === 'owner' || item.role === 'primary_owner'),
        ).length,
        openReportCount,
      },
    }
  }

  private findPostItem(postId: string): SystemAdminPostItem {
    const item = this.state.posts.find((candidate) => candidate.post.id === postId)
    if (!item) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '対象のお知らせが見つかりません。')
    }

    return item
  }

  private findCreationRequest(requestId: string): SystemSpaceCreationRequestSummary {
    const request = this.state.creationRequests.find((item) => item.request.id === requestId)
    if (!request) {
      throw new SystemAdminApiError('SPACE_CREATION_REQUEST_NOT_FOUND', 'スペース作成申請が見つかりません。')
    }

    return request
  }

  private resolveAuthorMembershipId(spaceId: string): string | null {
    return this.findSpaceRecord(spaceId).primaryOwner.membershipId ?? null
  }

  private resolveRecipientUserIds(
    spaceId: string,
    audienceType: 'all_members' | 'targeted_users',
    recipientUserIds: string[],
  ): string[] {
    if (audienceType !== 'targeted_users') {
      return []
    }

    const uniqueRecipientUserIds = Array.from(new Set(recipientUserIds))
    if (uniqueRecipientUserIds.length === 0) {
      throw new SystemAdminApiError('VALIDATION_ERROR', '配信先アカウントを1件以上選択してください。')
    }

    const invalidRecipient = uniqueRecipientUserIds.find((userId) => {
      const user = this.state.users.find((item) => item.user.id === userId)
      return !user?.memberships.some((membership) => membership.spaceId === spaceId && membership.status === 'active')
    })

    if (invalidRecipient) {
      throw new SystemAdminApiError('CONFLICT', '指定したアカウントはこのスペースの有効メンバーではありません。')
    }

    return uniqueRecipientUserIds
  }

  private buildDashboardMetrics(): SystemDashboardMetrics {
    return {
      spaceCount: this.state.spaces.length,
      activeSpaceCount: this.state.spaces.filter((item) => item.space.status === 'active').length,
      userCount: this.state.users.length,
      lockedUserCount: this.state.users.filter((item) => item.user.status === 'locked').length,
      openReportCount: this.state.reports.filter((item) => item.report.status === 'open').length,
      orphanedPrimaryOwnerCount: this.state.spaces.filter((item) => !item.primaryOwner.userId).length,
    }
  }

  private addAuditLog(action: string, entityType: SystemAuditLog['entityType'], entityId: string, message: string) {
    const id = `audit_${String(this.state.nextAuditSequence).padStart(3, '0')}`
    this.state.nextAuditSequence += 1
    this.state.auditLogs.unshift({
      id,
      action,
      entityType,
      entityId,
      message,
      createdAt: nowIso(),
    })
  }

  private resolutionLabel(resolution: ResolutionType): string {
    switch (resolution) {
      case 'no_action':
        return '対応なし'
      case 'content_removed':
        return '投稿削除'
      case 'mute':
        return 'ミュート'
      case 'kick':
        return '強制退出'
      case 'suspend':
        return '利用停止'
      case 'ban':
        return 'BAN'
      default:
        return resolution
    }
  }
}
