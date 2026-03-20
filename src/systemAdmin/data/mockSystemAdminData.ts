import type { UserResource } from '../../types/api'
import type {
  SystemAdminPostItem,
  SystemAdminUser,
  SystemAuditLog,
  SystemReportSummary,
  SystemSpaceOwnerSummary,
  SystemSpaceResource,
  SystemUserSummary,
} from '../types'

export interface MockSystemAdminSpaceRecord {
  space: SystemSpaceResource
  primaryOwner: SystemSpaceOwnerSummary
}

export interface MockSystemAdminState {
  currentAdminId: string | null
  admins: SystemAdminUser[]
  users: SystemUserSummary[]
  spaces: MockSystemAdminSpaceRecord[]
  posts: SystemAdminPostItem[]
  reports: SystemReportSummary[]
  auditLogs: SystemAuditLog[]
  nextSpaceSequence: number
  nextMembershipSequence: number
  nextPostSequence: number
  nextReportSequence: number
  nextAuditSequence: number
}

function userResource(input: Partial<UserResource> & Pick<UserResource, 'id' | 'email' | 'displayName'>): UserResource {
  return {
    id: input.id,
    email: input.email,
    displayName: input.displayName,
    status: input.status ?? 'active',
    emailVerifiedAt: input.emailVerifiedAt ?? '2026-03-01T00:00:00Z',
    lastLoginAt: input.lastLoginAt ?? '2026-03-19T06:45:00Z',
    createdAt: input.createdAt ?? '2026-03-01T00:00:00Z',
  }
}

export function createInitialSystemAdminState(): MockSystemAdminState {
  const users: SystemUserSummary[] = [
    {
      user: userResource({
        id: 'user_primary_owner_001',
        email: 'primary-owner@noccaro.local',
        displayName: '佐藤 ゆき',
      }),
      memberships: [
        {
          membershipId: 'membership_space_001_primary',
          spaceId: 'space_001',
          spaceName: 'Noccaro コミュニティ',
          role: 'primary_owner',
          status: 'active',
        },
      ],
    },
    {
      user: userResource({
        id: 'user_owner_002',
        email: 'owner-support@noccaro.local',
        displayName: '高橋 サポート',
      }),
      memberships: [
        {
          membershipId: 'membership_space_001_owner',
          spaceId: 'space_001',
          spaceName: 'Noccaro コミュニティ',
          role: 'owner',
          status: 'active',
        },
        {
          membershipId: 'membership_space_003_owner',
          spaceId: 'space_003',
          spaceName: 'レスキュー候補スペース',
          role: 'owner',
          status: 'active',
        },
      ],
    },
    {
      user: userResource({
        id: 'user_guest_003',
        email: 'guest-member@noccaro.local',
        displayName: '山田 ゲスト',
      }),
      memberships: [
        {
          membershipId: 'membership_space_001_guest',
          spaceId: 'space_001',
          spaceName: 'Noccaro コミュニティ',
          role: 'guest',
          status: 'active',
        },
        {
          membershipId: 'membership_space_002_guest',
          spaceId: 'space_002',
          spaceName: '子育てサークル',
          role: 'guest',
          status: 'suspended',
        },
      ],
    },
    {
      user: userResource({
        id: 'user_risk_004',
        email: 'risk-review@noccaro.local',
        displayName: '伊藤 リスク確認',
        status: 'locked',
      }),
      memberships: [
        {
          membershipId: 'membership_space_003_guest',
          spaceId: 'space_003',
          spaceName: 'レスキュー候補スペース',
          role: 'guest',
          status: 'active',
        },
      ],
    },
    {
      user: userResource({
        id: 'user_recovery_005',
        email: 'recovery-owner@noccaro.local',
        displayName: '中村 リカバリー',
      }),
      memberships: [
        {
          membershipId: 'membership_space_002_primary',
          spaceId: 'space_002',
          spaceName: '子育てサークル',
          role: 'primary_owner',
          status: 'active',
        },
      ],
    },
    {
      user: userResource({
        id: 'user_new_006',
        email: 'new-space-owner@noccaro.local',
        displayName: '小林 新規オーナー',
      }),
      memberships: [],
    },
  ]

  const spaces: MockSystemAdminSpaceRecord[] = [
    {
      space: {
        id: 'space_001',
        code: 'NOC2026',
        name: 'Noccaro コミュニティ',
        description: '基幹運用中のメインスペース',
        joinPolicy: 'approval_required',
        status: 'active',
        maxOwnerCount: 3,
        whisperTtlMinutes: 180,
        whisperMaxLength: 30,
        locationGridMeters: 120,
        locationJitterEnabled: true,
        createdAt: '2026-03-01T03:00:00Z',
      },
      primaryOwner: {
        membershipId: 'membership_space_001_primary',
        userId: 'user_primary_owner_001',
        displayName: '佐藤 ゆき',
        email: 'primary-owner@noccaro.local',
      },
    },
    {
      space: {
        id: 'space_002',
        code: 'MAMA2026',
        name: '子育てサークル',
        description: '招待制の地域コミュニティ',
        joinPolicy: 'auto_approve',
        status: 'active',
        maxOwnerCount: 3,
        whisperTtlMinutes: 180,
        whisperMaxLength: 30,
        locationGridMeters: 100,
        locationJitterEnabled: true,
        createdAt: '2026-03-05T09:30:00Z',
      },
      primaryOwner: {
        membershipId: 'membership_space_002_primary',
        userId: 'user_recovery_005',
        displayName: '中村 リカバリー',
        email: 'recovery-owner@noccaro.local',
      },
    },
    {
      space: {
        id: 'space_003',
        code: 'RESCUE01',
        name: 'レスキュー候補スペース',
        description: '主オーナー不在の復旧対象スペース',
        joinPolicy: 'approval_required',
        status: 'suspended',
        maxOwnerCount: 2,
        whisperTtlMinutes: 180,
        whisperMaxLength: 30,
        locationGridMeters: 120,
        locationJitterEnabled: true,
        createdAt: '2026-03-09T11:20:00Z',
      },
      primaryOwner: {
        membershipId: null,
        userId: null,
        displayName: null,
        email: null,
      },
    },
  ]

  const reports: SystemReportSummary[] = [
    {
      report: {
        id: 'report_001',
        spaceId: 'space_001',
        targetType: 'whisper',
        targetId: 'whisper_001',
        reasonType: 'privacy_risk',
        status: 'open',
        resolutionType: null,
        createdAt: '2026-03-19T05:10:00Z',
        handledAt: null,
      },
      space: {
        id: 'space_001',
        code: 'NOC2026',
        name: 'Noccaro コミュニティ',
      },
      target: {
        id: 'whisper_001',
        body: '駅前で待っています',
      },
      reporter: {
        id: 'user_guest_003',
        email: 'guest-member@noccaro.local',
        displayName: '山田 ゲスト',
      },
    },
    {
      report: {
        id: 'report_002',
        spaceId: 'space_002',
        targetType: 'whisper',
        targetId: 'whisper_002',
        reasonType: 'spam',
        status: 'reviewing',
        resolutionType: null,
        createdAt: '2026-03-19T04:30:00Z',
        handledAt: null,
      },
      space: {
        id: 'space_002',
        code: 'MAMA2026',
        name: '子育てサークル',
      },
      target: {
        id: 'whisper_002',
        body: '副業の案内です',
      },
      reporter: {
        id: 'user_recovery_005',
        email: 'recovery-owner@noccaro.local',
        displayName: '中村 リカバリー',
      },
    },
    {
      report: {
        id: 'report_003',
        spaceId: 'space_003',
        targetType: 'whisper',
        targetId: 'whisper_003',
        reasonType: 'harassment',
        status: 'open',
        resolutionType: null,
        createdAt: '2026-03-19T03:00:00Z',
        handledAt: null,
      },
      space: {
        id: 'space_003',
        code: 'RESCUE01',
        name: 'レスキュー候補スペース',
      },
      target: {
        id: 'whisper_003',
        body: '嫌がらせメッセージの報告対象',
      },
      reporter: {
        id: 'user_owner_002',
        email: 'owner-support@noccaro.local',
        displayName: '高橋 サポート',
      },
    },
  ]

  const admins: SystemAdminUser[] = [
    {
      id: 'system_admin_001',
      email: 'sysadmin@noccaro.local',
      displayName: 'Noccaro 運営管理者',
      role: 'system_admin',
      createdAt: '2026-03-01T00:00:00Z',
    },
  ]

  const posts: SystemAdminPostItem[] = [
    {
      post: {
        id: 'sys_post_001',
        spaceId: 'space_001',
        authorMembershipId: 'membership_space_001_primary',
        category: 'operation',
        audienceType: 'all_members',
        title: 'システムメンテナンスのお知らせ',
        body: '3月末にかけて一部機能の改善を予定しています。',
        status: 'published',
        notifyMembers: true,
        publishedAt: '2026-03-18T09:00:00Z',
        visibleFrom: null,
        visibleTo: null,
        reactionCount: 0,
        reactedByMe: false,
        isRead: false,
        readAt: null,
        targetedToMe: false,
        recipientUserIds: [],
        createdAt: '2026-03-18T08:30:00Z',
        updatedAt: '2026-03-18T09:00:00Z',
      },
      createdBySystemAdmin: admins[0],
    },
    {
      post: {
        id: 'sys_post_002',
        spaceId: 'space_001',
        authorMembershipId: 'membership_space_001_primary',
        category: 'operation',
        audienceType: 'targeted_users',
        title: '対象ユーザー向けの確認依頼',
        body: 'プロフィール内容の確認をお願いします。',
        status: 'draft',
        notifyMembers: false,
        publishedAt: null,
        visibleFrom: null,
        visibleTo: null,
        reactionCount: 0,
        reactedByMe: false,
        isRead: false,
        readAt: null,
        targetedToMe: false,
        recipientUserIds: ['user_guest_003'],
        createdAt: '2026-03-19T07:00:00Z',
        updatedAt: '2026-03-19T07:00:00Z',
      },
      createdBySystemAdmin: admins[0],
    },
  ]

  const auditLogs: SystemAuditLog[] = [
    {
      id: 'audit_001',
      action: 'space_created',
      entityType: 'space',
      entityId: 'space_003',
      message: 'レスキュー候補スペースを作成しました。',
      createdAt: '2026-03-09T11:20:00Z',
    },
    {
      id: 'audit_002',
      action: 'user_locked',
      entityType: 'user',
      entityId: 'user_risk_004',
      message: '不審挙動のため一時ロックしました。',
      createdAt: '2026-03-18T12:00:00Z',
    },
    {
      id: 'audit_003',
      action: 'report_escalated',
      entityType: 'report',
      entityId: 'report_003',
      message: '主オーナー不在スペースの通報を運営対応に引き上げました。',
      createdAt: '2026-03-19T03:15:00Z',
    },
  ]

  return {
    currentAdminId: null,
    admins,
    users,
    spaces,
    posts,
    reports,
    auditLogs,
    nextSpaceSequence: 4,
    nextMembershipSequence: 7,
    nextPostSequence: 3,
    nextReportSequence: 4,
    nextAuditSequence: 4,
  }
}
