import { beforeEach, describe, expect, it } from 'vitest'
import { MockAdminService } from './mockAdminService'
import { clearFallbackStorage } from '../utils/storage'

describe('MockAdminService', () => {
  beforeEach(() => {
    clearFallbackStorage()
  })

  it('logs in with seeded admin credentials and returns joined spaces', async () => {
    const service = new MockAdminService()

    const auth = await service.login({
      email: 'primary-owner@noccaro.local',
      password: 'password123',
    })
    const joinedSpaces = await service.getJoinedSpaces()
    const adminSpace = await service.getAdminSpace(joinedSpaces.joinedSpaces[0].space.id)

    expect(auth.user.email).toBe('primary-owner@noccaro.local')
    expect(joinedSpaces.joinedSpaces[0].space.id).toBeTruthy()
    expect(adminSpace.membership.role).toBe('primary_owner')
  })

  it('returns admin member items and can approve a pending membership', async () => {
    const service = new MockAdminService()
    await service.login({
      email: 'primary-owner@noccaro.local',
      password: 'password123',
    })

    const joinedSpaces = await service.getJoinedSpaces()
    const spaceId = joinedSpaces.joinedSpaces[0].space.id
    const joinRequests = await service.getJoinRequests(spaceId)

    expect(joinRequests).toHaveLength(1)

    await service.approveMembership(joinRequests[0].membership.id, 'approved in test')

    const members = await service.getMembers(spaceId)
    expect(members.data.some((item) => item.membership.status === 'active')).toBe(true)
  })

  it('creates and publishes admin posts through contract-style methods', async () => {
    const service = new MockAdminService()
    await service.login({
      email: 'primary-owner@noccaro.local',
      password: 'password123',
    })

    const joinedSpaces = await service.getJoinedSpaces()
    const spaceId = joinedSpaces.joinedSpaces[0].space.id

    const created = await service.createAdminPost(spaceId, {
      title: 'Contract-first post',
      body: 'Created through the admin service adapter.',
      status: 'draft',
      notifyMembers: false,
    })

    const published = await service.publishAdminPost(created.id, true)
    const posts = await service.getAdminPosts(spaceId)

    expect(created.status).toBe('draft')
    expect(published.status).toBe('published')
    expect(posts.data.some((post) => post.id === created.id)).toBe(true)
  })

  it('supports targeted owner notices with recipient selection', async () => {
    const service = new MockAdminService()
    await service.login({
      email: 'primary-owner@noccaro.local',
      password: 'password123',
    })

    const joinedSpaces = await service.getJoinedSpaces()
    const spaceId = joinedSpaces.joinedSpaces[0].space.id

    const created = await service.createAdminPost(spaceId, {
      category: 'owner',
      title: 'あなたへのお知らせ',
      body: '対象ユーザーだけが受け取ります。',
      status: 'draft',
      notifyMembers: false,
      audienceType: 'targeted_users',
      recipientUserIds: ['usr-0003'],
    })

    const updated = await service.updateAdminPost(created.id, {
      audienceType: 'targeted_users',
      recipientUserIds: ['usr-0003', 'usr-0004'],
      notifyMembers: true,
    })
    const published = await service.publishAdminPost(created.id, true)

    expect(created.category).toBe('owner')
    expect(created.audienceType).toBe('targeted_users')
    expect(created.recipientUserIds).toEqual(['usr-0003'])
    expect(updated.notifyMembers).toBe(true)
    expect(updated.recipientUserIds).toEqual(['usr-0003', 'usr-0004'])
    expect(published.notifyMembers).toBe(true)
  })

  it('updates profile fields and requires current password for email changes', async () => {
    const service = new MockAdminService()
    await service.login({
      email: 'primary-owner@noccaro.local',
      password: 'password123',
    })

    const displayNameOnly = await service.updateProfile({
      displayName: '新しい表示名',
    })

    expect(displayNameOnly.user.displayName).toBe('新しい表示名')
    expect(displayNameOnly.profileUpdate.emailChangeRequiresVerification).toBe(false)

    await expect(
      service.updateProfile({
        email: 'updated-owner@example.com',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

    const updated = await service.updateProfile({
      email: 'updated-owner@example.com',
      currentPassword: 'password123',
    })

    expect(updated.user.email).toBe('updated-owner@example.com')
    expect(updated.profileUpdate.pendingEmail).toBeNull()
  })
})
