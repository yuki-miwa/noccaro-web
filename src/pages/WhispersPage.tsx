import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, whisperStatusLabel } from '../utils/format'
import type { WhisperStatus } from '../types/domain'

const whisperFilters: Array<{ label: string; value: 'all' | WhisperStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Hidden', value: 'hidden_by_report' },
  { label: 'Removed', value: 'removed_by_owner' },
  { label: 'Expired', value: 'expired' },
]

export function WhispersPage() {
  const { snapshot, loading, removeWhisper, createReport } = useAdminContext()
  const [statusFilter, setStatusFilter] = useState<'all' | WhisperStatus>('all')

  const whispers = useMemo(() => {
    const allWhispers = snapshot?.whispers ?? []
    const activeSpaceId = snapshot?.activeSpaceId
    return allWhispers
      .filter((whisper) => whisper.spaceId === activeSpaceId)
      .filter((whisper) => (statusFilter === 'all' ? true : whisper.status === statusFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [snapshot, statusFilter])

  if (!snapshot) {
    return <p className="page-empty">Loading whispers...</p>
  }

  const currentMembership = snapshot.memberships.find(
    (membership) => membership.userId === snapshot.currentUserId && membership.spaceId === snapshot.activeSpaceId,
  )

  const simulateReport = async (whisperId: number) => {
    if (!currentMembership) {
      return
    }

    await createReport({
      reporterMembershipId: currentMembership.id,
      targetType: 'whisper',
      targetId: whisperId,
      reasonType: 'inappropriate',
      detail: 'Simulated report from whisper moderation screen.',
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Whisper Moderation</h2>
          <span>TTL / auto-hide / remove controls</span>
        </div>
        <div className="filter-group">
          {whisperFilters.map((filter) => (
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

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Body</th>
                <th>Status</th>
                <th>Grid</th>
                <th>Reports</th>
                <th>Expires At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {whispers.map((whisper) => (
                <tr key={whisper.id}>
                  <td>{whisper.publicId}</td>
                  <td>{whisper.body}</td>
                  <td>{whisperStatusLabel(whisper.status)}</td>
                  <td>
                    <div className="row-subtext">{whisper.gridKey}</div>
                    <div className="row-subtext">
                      ({whisper.displayLat.toFixed(5)}, {whisper.displayLng.toFixed(5)})
                    </div>
                  </td>
                  <td>{whisper.reportCount}</td>
                  <td>{formatIso(whisper.expiresAt)}</td>
                  <td>
                    <div className="actions-grid">
                      {(whisper.status === 'active' || whisper.status === 'hidden_by_report') && (
                        <button
                          type="button"
                          onClick={() => void removeWhisper(whisper.id, 'Removed from whispers screen')}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      )}

                      {whisper.status === 'active' && (
                        <button type="button" onClick={() => void simulateReport(whisper.id)} disabled={loading}>
                          +1 Report (mock)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
