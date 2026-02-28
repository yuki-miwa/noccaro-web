import { describe, expect, it } from 'vitest'
import { MockAdminApi } from './mockAdminApi'

describe('MockAdminApi', () => {
  it('auto-hides whisper when report count reaches threshold', async () => {
    const api = new MockAdminApi()

    await api.createReport({
      reporterMembershipId: 1,
      targetType: 'whisper',
      targetId: 1,
      reasonType: 'inappropriate',
      detail: 'report 1',
    })
    await api.createReport({
      reporterMembershipId: 2,
      targetType: 'whisper',
      targetId: 1,
      reasonType: 'inappropriate',
      detail: 'report 2',
    })
    await api.createReport({
      reporterMembershipId: 4,
      targetType: 'whisper',
      targetId: 1,
      reasonType: 'inappropriate',
      detail: 'report 3',
    })
    await api.createReport({
      reporterMembershipId: 9,
      targetType: 'whisper',
      targetId: 1,
      reasonType: 'inappropriate',
      detail: 'report 4',
    })

    const snapshot = await api.getSnapshot()
    const whisper = snapshot.whispers.find((item) => item.id === 1)

    expect(whisper?.reportCount).toBe(5)
    expect(whisper?.status).toBe('hidden_by_report')
    expect(whisper?.hiddenAt).not.toBeNull()
  })

  it('enforces owner slot cap excluding primary owner', async () => {
    const api = new MockAdminApi()

    await api.grantOwner(3)

    await expect(api.grantOwner(4)).rejects.toMatchObject({
      code: 'owner_limit_reached',
    })

    const snapshot = await api.getSnapshot()
    const ownerCount = snapshot.memberships.filter(
      (membership) => membership.spaceId === snapshot.activeSpaceId && membership.status === 'active' && membership.role === 'owner',
    ).length

    expect(ownerCount).toBe(3)
  })

  it('allows ban only when actor is primary owner', async () => {
    const api = new MockAdminApi()

    await api.transferPrimaryOwner(2)

    await expect(api.banMember(3)).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('approves pending membership and records member action', async () => {
    const api = new MockAdminApi()

    await api.approveMembership(6)

    const snapshot = await api.getSnapshot()
    const membership = snapshot.memberships.find((item) => item.id === 6)
    const latestAction = snapshot.memberActions[0]

    expect(membership?.status).toBe('active')
    expect(membership?.approvedByMembershipId).toBe(1)
    expect(latestAction.actionType).toBe('approve')
    expect(latestAction.targetMembershipId).toBe(6)
  })
})
