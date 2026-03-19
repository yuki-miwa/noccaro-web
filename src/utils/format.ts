import type {
  JoinPolicy,
  MembershipStatus,
  PostStatus,
  ReportReasonType,
  ReportStatus,
  ResolutionType,
  SpaceRole,
  WhisperStatus,
} from '../types/api'

export function formatIso(value: string | null): string {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

export function roleLabel(role: SpaceRole): string {
  switch (role) {
    case 'primary_owner':
      return '主オーナー'
    case 'owner':
      return 'オーナー'
    case 'guest':
      return 'ゲスト'
    default:
      return role
  }
}

export function membershipStatusLabel(status: MembershipStatus): string {
  switch (status) {
    case 'pending':
      return '承認待ち'
    case 'active':
      return '参加中'
    case 'suspended':
      return '利用停止'
    case 'kicked':
      return '強制退出'
    case 'banned':
      return 'BAN'
    case 'left':
      return '退会'
    default:
      return status
  }
}

export function whisperStatusLabel(status: WhisperStatus): string {
  switch (status) {
    case 'active':
      return '公開中'
    case 'hidden_by_report':
      return '通報で非表示'
    case 'removed_by_owner':
      return '運営削除'
    case 'removed_by_system':
      return 'システム削除'
    case 'expired':
      return '期限切れ'
    default:
      return status
  }
}

export function reportStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'open':
      return '未対応'
    case 'reviewing':
      return '確認中'
    case 'resolved':
      return '対応済み'
    case 'rejected':
      return '却下'
    default:
      return status
  }
}

export function joinPolicyLabel(policy: JoinPolicy): string {
  switch (policy) {
    case 'auto_approve':
      return '自動承認'
    case 'approval_required':
      return '承認制'
    default:
      return policy
  }
}

export function postStatusLabel(status: PostStatus): string {
  switch (status) {
    case 'draft':
      return '下書き'
    case 'published':
      return '公開中'
    case 'archived':
      return 'アーカイブ'
    case 'deleted':
      return '削除済み'
    default:
      return status
  }
}

export function reportReasonLabel(reason: ReportReasonType): string {
  switch (reason) {
    case 'spam':
      return 'スパム'
    case 'harassment':
      return '嫌がらせ'
    case 'privacy_risk':
      return 'プライバシー侵害'
    case 'inappropriate':
      return '不適切'
    case 'other':
      return 'その他'
    default:
      return reason
  }
}

export function resolutionLabel(resolution: ResolutionType): string {
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
