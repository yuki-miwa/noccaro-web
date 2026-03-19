import { useAdminContext } from '../context/AdminContext'
import { StatCard } from '../components/StatCard'
import { formatIso, membershipStatusLabel, reportStatusLabel, roleLabel } from '../utils/format'

export function DashboardPage() {
  const { joinRequests, members, metrics, posts, reports, selectedSpace, selectedMembership, whispers } =
    useAdminContext()

  if (!selectedSpace || !selectedMembership) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>Admin Space Required</h2>
        </div>
        <p className="empty-text">Select a space where your membership role is `owner` or `primary_owner`.</p>
      </section>
    )
  }

  return (
    <div className="page-stack">
      <section className="panel stat-grid">
        <StatCard title="Active Members" value={metrics.activeMemberCount} hint="GET /admin/spaces/{spaceId}/members" />
        <StatCard title="Pending Requests" value={metrics.pendingMemberCount} hint="GET /admin/spaces/{spaceId}/join-requests" />
        <StatCard title="Active Whispers" value={metrics.activeWhisperCount} hint="GET /spaces/{spaceId}/whispers" />
        <StatCard title="Open Reports" value={metrics.openReportCount} hint="GET /admin/spaces/{spaceId}/reports" />
        <StatCard title="Published Posts" value={metrics.publishedPostCount} hint="status=published" />
        <StatCard title="Your Role" value={roleLabel(selectedMembership.role)} hint={membershipStatusLabel(selectedMembership.status)} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Selected Space</h2>
          <span>{selectedSpace.id}</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>Name</dt>
            <dd>{selectedSpace.name}</dd>
            <dt>Code</dt>
            <dd>{selectedSpace.code}</dd>
            <dt>Join Policy</dt>
            <dd>{selectedSpace.joinPolicy}</dd>
            <dt>Description</dt>
            <dd>{selectedSpace.description ?? '-'}</dd>
          </dl>
          <dl>
            <dt>Owner Cap</dt>
            <dd>{selectedSpace.maxOwnerCount}</dd>
            <dt>Whisper TTL</dt>
            <dd>{selectedSpace.whisperTtlMinutes} min</dd>
            <dt>Whisper Max Length</dt>
            <dd>{selectedSpace.whisperMaxLength}</dd>
            <dt>Grid / Jitter</dt>
            <dd>
              {selectedSpace.locationGridMeters}m / {selectedSpace.locationJitterEnabled ? 'enabled' : 'disabled'}
            </dd>
          </dl>
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>Pending Join Requests</h2>
            <span>{joinRequests.length}</span>
          </div>
          {joinRequests.length === 0 ? (
            <p className="empty-text">No pending memberships.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Membership</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {joinRequests.slice(0, 5).map((item) => (
                  <tr key={item.membership.id}>
                    <td>{item.user.displayName}</td>
                    <td>{item.membership.id}</td>
                    <td>{formatIso(item.membership.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>Latest Reports</h2>
            <span>{reports.length}</span>
          </div>
          {reports.length === 0 ? (
            <p className="empty-text">No reports yet.</p>
          ) : (
            <ul className="event-list">
              {reports.slice(0, 5).map((item) => (
                <li key={item.report.id}>
                  <strong>{item.target.whisper?.body ?? item.report.targetType}</strong>
                  <span>
                    {item.report.reasonType} / {reportStatusLabel(item.report.status)}
                  </span>
                  <small>{formatIso(item.report.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>Recent Posts</h2>
            <span>{posts.length}</span>
          </div>
          {posts.length === 0 ? (
            <p className="empty-text">No owner posts.</p>
          ) : (
            <ul className="event-list">
              {posts.slice(0, 5).map((post) => (
                <li key={post.id}>
                  <strong>{post.title}</strong>
                  <span>
                    {post.status} / {post.reactionCount} reactions
                  </span>
                  <small>{formatIso(post.updatedAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>Active Whispers</h2>
            <span>{whispers.length}</span>
          </div>
          {whispers.length === 0 ? (
            <p className="empty-text">No active whispers returned by the public whisper API.</p>
          ) : (
            <ul className="event-list">
              {whispers.slice(0, 5).map((whisper) => (
                <li key={whisper.id}>
                  <strong>{whisper.body}</strong>
                  <span>{whisper.reportCount} reports</span>
                  <small>{formatIso(whisper.expiresAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Membership Snapshot</h2>
          <span>{members.length} members</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Mute</th>
              <th>Suspend</th>
            </tr>
          </thead>
          <tbody>
            {members.slice(0, 6).map((item) => (
              <tr key={item.membership.id}>
                <td>{item.user.displayName}</td>
                <td>{roleLabel(item.membership.role)}</td>
                <td>{membershipStatusLabel(item.membership.status)}</td>
                <td>{formatIso(item.membership.muteUntil)}</td>
                <td>{formatIso(item.membership.suspendedUntil)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
