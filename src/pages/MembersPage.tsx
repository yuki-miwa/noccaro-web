import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, membershipStatusLabel, roleLabel } from '../utils/format'
import type { MembershipStatus } from '../types/domain'

const statusFilters: Array<{ label: string; value: 'all' | MembershipStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Banned', value: 'banned' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Left/Kicked', value: 'left' },
]

export function MembersPage() {
  const {
    snapshot,
    loading,
    approveMembership,
    rejectMembership,
    grantOwner,
    revokeOwner,
    transferPrimaryOwner,
    muteMember,
    unmuteMember,
    kickMember,
    suspendMember,
    unsuspendMember,
    banMember,
    unbanMember,
  } = useAdminContext()

  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [keyword, setKeyword] = useState('')

  const activeSpace = snapshot?.spaces.find((space) => space.id === snapshot.activeSpaceId)
  const memberships = useMemo(
    () => snapshot?.memberships.filter((membership) => membership.spaceId === snapshot.activeSpaceId) ?? [],
    [snapshot],
  )
  const currentMembership = memberships.find((membership) => membership.userId === snapshot?.currentUserId)

  const activeOwnerCount = memberships.filter(
    (membership) => membership.status === 'active' && membership.role === 'owner',
  ).length

  const filteredMemberships = useMemo(() => {
    return memberships
      .filter((membership) => {
        if (statusFilter === 'all') {
          return true
        }
        if (statusFilter === 'left') {
          return membership.status === 'left' || membership.status === 'kicked'
        }
        return membership.status === statusFilter
      })
      .filter((membership) => {
        if (!keyword.trim()) {
          return true
        }
        const user = snapshot?.users.find((item) => item.id === membership.userId)
        const merged = `${membership.publicId} ${user?.displayName ?? ''} ${user?.email ?? ''}`.toLowerCase()
        return merged.includes(keyword.trim().toLowerCase())
      })
  }, [keyword, memberships, snapshot?.users, statusFilter])

  if (!snapshot) {
    return <p className="page-empty">Loading members...</p>
  }

  const runMute = async (membershipId: number) => {
    const input = window.prompt('Mute duration in hours (default: 24)', '24')
    const hours = Number(input)
    await muteMember({
      membershipId,
      hours: Number.isNaN(hours) || hours <= 0 ? 24 : hours,
      reason: 'Muted from members page',
    })
  }

  const runSuspend = async (membershipId: number) => {
    const input = window.prompt('Suspend duration in hours (default: 72)', '72')
    const hours = Number(input)
    await suspendMember({
      membershipId,
      hours: Number.isNaN(hours) || hours <= 0 ? 72 : hours,
      reason: 'Suspended from members page',
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Member Control</h2>
          <span>
            Owner cap: {activeOwnerCount}/{activeSpace?.maxOwnerCount ?? 0} (excluding primary_owner)
          </span>
        </div>
        <div className="members-toolbar">
          <div className="filter-group" role="tablist" aria-label="Membership status filter">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={statusFilter === filter.value ? 'chip chip-active' : 'chip'}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input
            className="search-input"
            placeholder="Search by name/email/public ID"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Restrictions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map((membership) => {
                const user = snapshot.users.find((item) => item.id === membership.userId)
                const isPrimary = membership.role === 'primary_owner'
                const isCurrent = membership.id === currentMembership?.id
                const isOwner = membership.role === 'owner'
                const canOwnerToggle = currentMembership?.role === 'primary_owner' && !isPrimary
                const canBan = currentMembership?.role === 'primary_owner' && !isPrimary
                const canModerate = currentMembership?.role === 'owner' || currentMembership?.role === 'primary_owner'

                return (
                  <tr key={membership.id}>
                    <td>
                      <strong>{user?.displayName ?? membership.publicId}</strong>
                      <div className="row-subtext">{user?.email ?? '-'}</div>
                      <div className="row-subtext">{membership.publicId}</div>
                    </td>
                    <td>{roleLabel(membership.role)}</td>
                    <td>{membershipStatusLabel(membership.status)}</td>
                    <td>{formatIso(membership.joinedAt)}</td>
                    <td>
                      <div className="row-subtext">mute_until: {formatIso(membership.muteUntil)}</div>
                      <div className="row-subtext">suspended_until: {formatIso(membership.suspendedUntil)}</div>
                      <div className="row-subtext">banned_at: {formatIso(membership.bannedAt)}</div>
                    </td>
                    <td>
                      <div className="actions-grid">
                        {membership.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void approveMembership(membership.id)}
                              disabled={loading || !canModerate}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void rejectMembership(membership.id)}
                              disabled={loading || !canModerate}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}

                        {membership.status === 'active' && canOwnerToggle && membership.role === 'guest' ? (
                          <button
                            type="button"
                            onClick={() => void grantOwner(membership.id)}
                            disabled={loading}
                          >
                            Grant Owner
                          </button>
                        ) : null}

                        {membership.status === 'active' && canOwnerToggle && membership.role === 'owner' ? (
                          <button
                            type="button"
                            onClick={() => void revokeOwner(membership.id)}
                            disabled={loading}
                          >
                            Revoke Owner
                          </button>
                        ) : null}

                        {membership.status === 'active' && canOwnerToggle && isOwner ? (
                          <button
                            type="button"
                            onClick={() => void transferPrimaryOwner(membership.id)}
                            disabled={loading}
                          >
                            Transfer Primary
                          </button>
                        ) : null}

                        {membership.status === 'active' && canModerate && !isPrimary && !isCurrent ? (
                          <>
                            <button type="button" onClick={() => void runMute(membership.id)} disabled={loading}>
                              Mute
                            </button>
                            <button
                              type="button"
                              onClick={() => void runSuspend(membership.id)}
                              disabled={loading}
                            >
                              Suspend
                            </button>
                            <button type="button" onClick={() => void kickMember(membership.id)} disabled={loading}>
                              Kick
                            </button>
                          </>
                        ) : null}

                        {membership.status === 'active' && canBan && !isCurrent && !isPrimary ? (
                          <button type="button" onClick={() => void banMember(membership.id)} disabled={loading}>
                            Ban
                          </button>
                        ) : null}

                        {membership.muteUntil && canModerate ? (
                          <button type="button" onClick={() => void unmuteMember(membership.id)} disabled={loading}>
                            Unmute
                          </button>
                        ) : null}

                        {membership.status === 'suspended' && canModerate ? (
                          <button
                            type="button"
                            onClick={() => void unsuspendMember(membership.id)}
                            disabled={loading}
                          >
                            Unsuspend
                          </button>
                        ) : null}

                        {membership.status === 'banned' && canBan ? (
                          <button type="button" onClick={() => void unbanMember(membership.id)} disabled={loading}>
                            Unban
                          </button>
                        ) : null}

                        {isPrimary ? <span className="row-subtext">Primary owner protected</span> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
