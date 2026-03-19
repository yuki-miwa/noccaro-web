import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, membershipStatusLabel, roleLabel } from '../utils/format'
import type { MembershipStatus } from '../types/api'

const statusFilters: Array<{ label: string; value: 'all' | MembershipStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Banned', value: 'banned' },
  { label: 'Kicked', value: 'kicked' },
  { label: 'Left', value: 'left' },
]

function hoursFromNowIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

export function MembersPage() {
  const {
    approveMembership,
    joinRequests,
    loading,
    members,
    patchMembership,
    rejectMembership,
    selectedMembership,
    selectedSpace,
  } = useAdminContext()

  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [keyword, setKeyword] = useState('')

  const activeOwnerCount = members.filter(
    (item) => item.membership.status === 'active' && item.membership.role === 'owner',
  ).length

  const filteredMembers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return members.filter((item) => {
      const matchesStatus = statusFilter === 'all' ? true : item.membership.status === statusFilter
      const haystack = `${item.user.displayName} ${item.user.email} ${item.membership.id}`.toLowerCase()
      const matchesKeyword = normalizedKeyword ? haystack.includes(normalizedKeyword) : true
      return matchesStatus && matchesKeyword
    })
  }, [keyword, members, statusFilter])

  if (!selectedSpace || !selectedMembership) {
    return <p className="page-empty">Select an admin-capable space to manage members.</p>
  }

  const runMute = async (membershipId: string) => {
    const hours = Number(window.prompt('Mute duration in hours', '24') ?? '24')
    const muteUntil = hoursFromNowIso(Number.isNaN(hours) || hours <= 0 ? 24 : hours)
    await patchMembership(membershipId, {
      muteUntil,
      reason: 'Muted from admin members screen',
    })
  }

  const runSuspend = async (membershipId: string) => {
    const hours = Number(window.prompt('Suspend duration in hours', '72') ?? '72')
    const suspendedUntil = hoursFromNowIso(Number.isNaN(hours) || hours <= 0 ? 72 : hours)
    await patchMembership(membershipId, {
      status: 'suspended',
      suspendedUntil,
      reason: 'Suspended from admin members screen',
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Pending Join Requests</h2>
          <span>{joinRequests.length}</span>
        </div>
        {joinRequests.length === 0 ? (
          <p className="empty-text">No pending requests.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Membership</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {joinRequests.map((item) => (
                <tr key={item.membership.id}>
                  <td>
                    <strong>{item.user.displayName}</strong>
                    <div className="row-subtext">{item.user.email}</div>
                  </td>
                  <td>{item.membership.id}</td>
                  <td>{formatIso(item.membership.createdAt)}</td>
                  <td>
                    <div className="actions-grid">
                      <button type="button" onClick={() => void approveMembership(item.membership.id)} disabled={loading}>
                        Approve
                      </button>
                      <button type="button" onClick={() => void rejectMembership(item.membership.id)} disabled={loading}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Members</h2>
          <span>
            Owners {activeOwnerCount}/{selectedSpace.maxOwnerCount}
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
            placeholder="Search by name, email, membership id"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Restrictions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((item) => {
                const isSelf = item.membership.id === selectedMembership.id
                const isPrimary = item.membership.role === 'primary_owner'
                const canPromote = selectedMembership.role === 'primary_owner' && !isPrimary
                const canBan = selectedMembership.role === 'primary_owner' && !isPrimary && !isSelf
                const canModerate =
                  (selectedMembership.role === 'owner' || selectedMembership.role === 'primary_owner') &&
                  !isPrimary &&
                  !isSelf

                return (
                  <tr key={item.membership.id}>
                    <td>
                      <strong>{item.user.displayName}</strong>
                      <div className="row-subtext">{item.user.email}</div>
                      <div className="row-subtext">{item.membership.id}</div>
                    </td>
                    <td>{roleLabel(item.membership.role)}</td>
                    <td>{membershipStatusLabel(item.membership.status)}</td>
                    <td>{formatIso(item.membership.joinedAt)}</td>
                    <td>
                      <div className="row-subtext">muteUntil: {formatIso(item.membership.muteUntil)}</div>
                      <div className="row-subtext">suspendedUntil: {formatIso(item.membership.suspendedUntil)}</div>
                      <div className="row-subtext">bannedAt: {formatIso(item.membership.bannedAt)}</div>
                    </td>
                    <td>
                      <div className="actions-grid">
                        {canPromote && item.membership.role === 'guest' ? (
                          <button
                            type="button"
                            onClick={() => void patchMembership(item.membership.id, { role: 'owner', reason: 'Grant owner' })}
                            disabled={loading}
                          >
                            Grant Owner
                          </button>
                        ) : null}
                        {canPromote && item.membership.role === 'owner' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void patchMembership(item.membership.id, { role: 'guest', reason: 'Revoke owner' })}
                              disabled={loading}
                            >
                              Revoke Owner
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patchMembership(item.membership.id, {
                                  role: 'primary_owner',
                                  reason: 'Transfer primary owner',
                                })
                              }
                              disabled={loading}
                            >
                              Transfer Primary
                            </button>
                          </>
                        ) : null}

                        {canModerate && item.membership.status === 'active' ? (
                          <>
                            <button type="button" onClick={() => void runMute(item.membership.id)} disabled={loading}>
                              Mute
                            </button>
                            <button type="button" onClick={() => void runSuspend(item.membership.id)} disabled={loading}>
                              Suspend
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patchMembership(item.membership.id, {
                                  status: 'kicked',
                                  reason: 'Kicked from members screen',
                                })
                              }
                              disabled={loading}
                            >
                              Kick
                            </button>
                          </>
                        ) : null}

                        {item.membership.muteUntil && canModerate ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                muteUntil: null,
                                reason: 'Unmute member',
                              })
                            }
                            disabled={loading}
                          >
                            Unmute
                          </button>
                        ) : null}

                        {item.membership.status === 'suspended' && canModerate ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'active',
                                reason: 'Unsuspend member',
                              })
                            }
                            disabled={loading}
                          >
                            Unsuspend
                          </button>
                        ) : null}

                        {canBan && item.membership.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'banned',
                                reason: 'Ban member',
                              })
                            }
                            disabled={loading}
                          >
                            Ban
                          </button>
                        ) : null}

                        {canBan && item.membership.status === 'banned' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'active',
                                reason: 'Unban member',
                              })
                            }
                            disabled={loading}
                          >
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
