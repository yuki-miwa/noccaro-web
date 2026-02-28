import { useMemo } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { StatCard } from '../components/StatCard'
import { formatIso, membershipStatusLabel, reportStatusLabel, roleLabel, whisperStatusLabel } from '../utils/format'

export function DashboardPage() {
  const { snapshot, metrics } = useAdminContext()

  const activeSpace = useMemo(
    () => snapshot?.spaces.find((space) => space.id === snapshot.activeSpaceId) ?? null,
    [snapshot],
  )

  if (!snapshot || !metrics || !activeSpace) {
    return <p className="page-empty">Loading dashboard...</p>
  }

  const memberships = snapshot.memberships.filter((item) => item.spaceId === snapshot.activeSpaceId)
  const pendingMemberships = memberships.filter((item) => item.status === 'pending')
  const latestReports = snapshot.reports
    .filter((report) => report.spaceId === snapshot.activeSpaceId)
    .slice(0, 5)

  const latestWhispers = snapshot.whispers
    .filter((whisper) => whisper.spaceId === snapshot.activeSpaceId)
    .slice(0, 6)

  const latestActions = snapshot.memberActions
    .filter((action) => action.spaceId === snapshot.activeSpaceId)
    .slice(0, 5)

  return (
    <div className="page-stack">
      <section className="panel stat-grid">
        <StatCard title="Active Members" value={metrics.activeMemberCount} hint="status=active" />
        <StatCard title="Pending Requests" value={metrics.pendingMemberCount} hint="status=pending" />
        <StatCard title="Active Whispers" value={metrics.activeWhisperCount} hint="ttl 3h" />
        <StatCard title="Open Reports" value={metrics.openReportCount} hint="moderation queue" />
        <StatCard title="Published Posts" value={metrics.publishedPostCount} hint="owner article" />
        <StatCard title="Hidden Whispers" value={metrics.hiddenWhisperCount} hint="auto/manual hidden" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Current Space Overview</h2>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>Name</dt>
            <dd>{activeSpace.name}</dd>
            <dt>Space Code</dt>
            <dd>{activeSpace.spaceCode}</dd>
            <dt>Join Policy</dt>
            <dd>{activeSpace.joinPolicy}</dd>
            <dt>Location Grid</dt>
            <dd>{activeSpace.locationGridMeters}m</dd>
          </dl>
          <dl>
            <dt>Owner Cap (excluding primary)</dt>
            <dd>{activeSpace.maxOwnerCount}</dd>
            <dt>Whisper TTL</dt>
            <dd>{activeSpace.whisperTtlMinutes} minutes</dd>
            <dt>Rate Limit</dt>
            <dd>
              {activeSpace.whisperRateLimitPerMinute}/min, {activeSpace.whisperRateLimitPer10Min}/10min
            </dd>
            <dt>Auto Hide Threshold</dt>
            <dd>{activeSpace.whisperAutoHideReportThreshold} reports</dd>
          </dl>
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>Pending Join Requests</h2>
            <span>{pendingMemberships.length}</span>
          </div>
          {pendingMemberships.length === 0 ? (
            <p className="empty-text">No pending memberships.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Membership</th>
                  <th>User</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {pendingMemberships.map((membership) => {
                  const user = snapshot.users.find((item) => item.id === membership.userId)
                  return (
                    <tr key={membership.id}>
                      <td>{membership.publicId}</td>
                      <td>{user?.displayName ?? '-'}</td>
                      <td>{formatIso(membership.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>Latest Reports</h2>
          </div>
          {latestReports.length === 0 ? (
            <p className="empty-text">No reports yet.</p>
          ) : (
            <ul className="event-list">
              {latestReports.map((report) => (
                <li key={report.id}>
                  <strong>{report.targetType}</strong>
                  <span>
                    {report.reasonType} / {reportStatusLabel(report.status)}
                  </span>
                  <small>{formatIso(report.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>Latest Whispers</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Reports</th>
                <th>Expires At</th>
              </tr>
            </thead>
            <tbody>
              {latestWhispers.map((whisper) => (
                <tr key={whisper.id}>
                  <td>{whisper.publicId}</td>
                  <td>{whisperStatusLabel(whisper.status)}</td>
                  <td>{whisper.reportCount}</td>
                  <td>{formatIso(whisper.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="panel-header">
            <h2>Recent Member Actions</h2>
          </div>
          {latestActions.length === 0 ? (
            <p className="empty-text">No actions.</p>
          ) : (
            <ul className="event-list">
              {latestActions.map((action) => {
                const target = snapshot.memberships.find((item) => item.id === action.targetMembershipId)
                const targetUser = snapshot.users.find((item) => item.id === target?.userId)
                return (
                  <li key={action.id}>
                    <strong>{action.actionType}</strong>
                    <span>
                      {targetUser?.displayName ?? action.targetMembershipId} / {target ? roleLabel(target.role) : '-'} /{' '}
                      {target ? membershipStatusLabel(target.status) : '-'}
                    </span>
                    <small>{formatIso(action.createdAt)}</small>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
