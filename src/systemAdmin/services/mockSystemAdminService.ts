import type { ApiListMeta, ResolutionType } from '../../types/api'
import { getAppStorage } from '../../utils/storage'
import { createInitialSystemAdminState } from '../data/mockSystemAdminData'
import type {
  SystemAdminAuthResult,
  SystemAdminMeResult,
  SystemAuditLog,
  SystemDashboardMetrics,
  SystemReportSummary,
  SystemSpaceResource,
  SystemSpaceSummary,
  SystemUserSummary,
} from '../types'
import type {
  AssignPrimaryOwnerInput,
  CreateSystemSpaceInput,
  PatchSystemSpaceInput,
  PatchSystemUserInput,
  ResolveSystemReportInput,
  SystemAdminLoginInput,
  SystemAdminService,
  SystemReportListQuery,
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

  async createSpace(input: CreateSystemSpaceInput): Promise<SystemSpaceSummary> {
    this.requireCurrentAdmin()

    const targetUser = this.state.users.find((item) => item.user.id === input.initialPrimaryOwnerUserId)
    if (!targetUser) {
      throw new SystemAdminApiError('RESOURCE_NOT_FOUND', '初期主オーナーのユーザーが見つかりません。')
    }

    if (targetUser.user.status !== 'active') {
      throw new SystemAdminApiError('CONFLICT', 'ロック中または無効なユーザーは主オーナーに設定できません。')
    }

    if (this.state.spaces.some((item) => item.space.code === input.spaceCode)) {
      throw new SystemAdminApiError('CONFLICT', '同じスペースコードは使用できません。')
    }

    const spaceId = `space_${String(this.state.nextSpaceSequence).padStart(3, '0')}`
    this.state.nextSpaceSequence += 1

    const membershipId = `membership_space_${String(this.state.nextMembershipSequence).padStart(3, '0')}_primary`
    this.state.nextMembershipSequence += 1

    const createdAt = nowIso()
    const space: SystemSpaceResource = {
      id: spaceId,
      code: input.spaceCode.trim(),
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
    record.space.code = input.spaceCode?.trim() || record.space.code
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
