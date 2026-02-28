import type { MembershipRole, MembershipStatus, ReportStatus, WhisperStatus } from '../types/domain'

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

export function roleLabel(role: MembershipRole): string {
  switch (role) {
    case 'primary_owner':
      return 'Primary Owner'
    case 'owner':
      return 'Owner'
    case 'guest':
      return 'Guest'
    default:
      return role
  }
}

export function membershipStatusLabel(status: MembershipStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'pending':
      return 'Pending'
    case 'suspended':
      return 'Suspended'
    case 'banned':
      return 'Banned'
    case 'kicked':
      return 'Kicked'
    case 'left':
      return 'Left'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

export function whisperStatusLabel(status: WhisperStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'hidden_by_report':
      return 'Hidden by report'
    case 'removed_by_owner':
      return 'Removed by owner'
    case 'removed_by_system':
      return 'Removed by system'
    case 'expired':
      return 'Expired'
    default:
      return status
  }
}

export function reportStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'reviewing':
      return 'Reviewing'
    case 'resolved':
      return 'Resolved'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}
