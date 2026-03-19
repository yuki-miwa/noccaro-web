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
})
