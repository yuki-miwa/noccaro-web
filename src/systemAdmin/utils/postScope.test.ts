import { describe, expect, it } from 'vitest'
import type { SystemAdminPostItem, SystemSpaceSummary } from '../types'
import {
  ALL_SPACES_SCOPE,
  getBroadcastTargetSpaceIds,
  isAllSpacesScope,
  mergePostItemsByUpdatedAt,
  resolvePostScopeSelection,
} from './postScope'

const spaces: SystemSpaceSummary[] = [
  {
    space: {
      id: 'space_active_1',
      code: 'AAA',
      name: 'Active A',
      description: null,
      joinPolicy: 'approval_required',
      status: 'active',
      maxOwnerCount: 3,
      whisperTtlMinutes: 180,
      whisperMaxLength: 30,
      locationGridMeters: 120,
      locationJitterEnabled: true,
      createdAt: '2026-03-20T00:00:00Z',
    },
    primaryOwner: {
      membershipId: 'membership_1',
      userId: 'user_1',
      displayName: 'Owner A',
      email: 'owner-a@example.com',
    },
    metrics: {
      memberCount: 10,
      pendingCount: 1,
      ownerCount: 2,
      openReportCount: 0,
    },
  },
  {
    space: {
      id: 'space_suspended_2',
      code: 'BBB',
      name: 'Suspended B',
      description: null,
      joinPolicy: 'approval_required',
      status: 'suspended',
      maxOwnerCount: 3,
      whisperTtlMinutes: 180,
      whisperMaxLength: 30,
      locationGridMeters: 120,
      locationJitterEnabled: true,
      createdAt: '2026-03-20T00:00:00Z',
    },
    primaryOwner: {
      membershipId: 'membership_2',
      userId: 'user_2',
      displayName: 'Owner B',
      email: 'owner-b@example.com',
    },
    metrics: {
      memberCount: 8,
      pendingCount: 0,
      ownerCount: 1,
      openReportCount: 2,
    },
  },
]

function postItem(id: string, updatedAt: string): SystemAdminPostItem {
  return {
    post: {
      id,
      spaceId: 'space_active_1',
      authorMembershipId: null,
      category: 'operation',
      audienceType: 'all_members',
      title: id,
      body: 'body',
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
      recipientUserIds: [],
      createdAt: updatedAt,
      updatedAt,
    },
    createdBySystemAdmin: null,
  }
}

describe('postScope helpers', () => {
  it('keeps all-spaces selection when requested', () => {
    expect(resolvePostScopeSelection(ALL_SPACES_SCOPE, spaces)).toBe(ALL_SPACES_SCOPE)
    expect(isAllSpacesScope(ALL_SPACES_SCOPE)).toBe(true)
  })

  it('falls back to the first known space when requested id is stale', () => {
    expect(resolvePostScopeSelection('missing_space', spaces)).toBe('space_active_1')
  })

  it('returns only active spaces for broadcast posting', () => {
    expect(getBroadcastTargetSpaceIds(spaces)).toEqual(['space_active_1'])
  })

  it('merges post groups in descending updated order', () => {
    const merged = mergePostItemsByUpdatedAt([
      [postItem('post_1', '2026-03-20T01:00:00Z')],
      [postItem('post_2', '2026-03-20T03:00:00Z'), postItem('post_3', '2026-03-20T02:00:00Z')],
    ])

    expect(merged.map((item) => item.post.id)).toEqual(['post_2', 'post_3', 'post_1'])
  })
})
