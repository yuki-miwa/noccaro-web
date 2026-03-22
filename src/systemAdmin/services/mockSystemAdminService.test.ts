import { beforeEach, describe, expect, it } from 'vitest'
import { clearFallbackStorage } from '../../utils/storage'
import { MockSystemAdminService } from './mockSystemAdminService'

describe('MockSystemAdminService', () => {
  beforeEach(() => {
    clearFallbackStorage()
  })

  it('logs in and loads dashboard metrics', async () => {
    const service = new MockSystemAdminService()
    const auth = await service.login({
      email: 'sysadmin@noccaro.local',
      password: 'password123',
    })
    const dashboard = await service.getDashboard()

    expect(auth.user.email).toBe('sysadmin@noccaro.local')
    expect(dashboard.spaceCount).toBeGreaterThan(0)
    expect(dashboard.orphanedPrimaryOwnerCount).toBeGreaterThan(0)
  })

  it('creates a space with an initial primary owner', async () => {
    const service = new MockSystemAdminService()
    await service.login({
      email: 'sysadmin@noccaro.local',
      password: 'password123',
    })

    const created = await service.createSpace({
      name: '新規スペース',
      description: '運用検証用',
      spaceCode: 'NEWSPACE',
      joinPolicy: 'approval_required',
      maxOwnerCount: 3,
      whisperTtlMinutes: 180,
      whisperMaxLength: 30,
      locationGridMeters: 120,
      locationJitterEnabled: true,
      initialPrimaryOwnerUserId: 'user_new_006',
    })

    expect(created.space.name).toBe('新規スペース')
    expect(created.primaryOwner.userId).toBe('user_new_006')
  })

  it('reassigns the primary owner for an orphaned space', async () => {
    const service = new MockSystemAdminService()
    await service.login({
      email: 'sysadmin@noccaro.local',
      password: 'password123',
    })

    const summary = await service.assignPrimaryOwner('space_003', {
      userId: 'user_new_006',
      note: 'recovery flow',
    })

    expect(summary.primaryOwner.userId).toBe('user_new_006')
    expect(summary.space.id).toBe('space_003')
  })

  it('creates and publishes targeted operation notices', async () => {
    const service = new MockSystemAdminService()
    await service.login({
      email: 'sysadmin@noccaro.local',
      password: 'password123',
    })

    const created = await service.createSpacePost('space_001', {
      category: 'operation',
      title: '個別フォロー',
      body: '指定ユーザー向けのご案内です。',
      status: 'draft',
      notifyMembers: true,
      audienceType: 'targeted_users',
      recipientUserIds: ['user_guest_003'],
    })

    const updated = await service.updateSpacePost(created.post.id, {
      audienceType: 'targeted_users',
      recipientUserIds: ['user_guest_003', 'user_owner_002'],
      notifyMembers: true,
    })

    const published = await service.publishSpacePost(updated.post.id, true)
    const posts = await service.getSpacePosts('space_001', { category: 'operation', limit: 100 })

    expect(created.post.category).toBe('operation')
    expect(created.post.audienceType).toBe('targeted_users')
    expect(created.post.notifyMembers).toBe(true)
    expect(updated.post.recipientUserIds).toEqual(['user_guest_003', 'user_owner_002'])
    expect(updated.post.notifyMembers).toBe(true)
    expect(published.post.status).toBe('published')
    expect(published.post.notifyMembers).toBe(true)
    expect(posts.data.some((item) => item.post.id === created.post.id)).toBe(true)
  })
})
