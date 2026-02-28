import { AdminProvider, useAdminContext } from './context/AdminContext'
import './App.css'

function App() {
  return (
    <AdminProvider>
      <AdminWorkbench />
    </AdminProvider>
  )
}

function AdminWorkbench() {
  const { snapshot, metrics, loading, error, lastActionAt, refresh, reset } = useAdminContext()

  if (!snapshot) {
    return (
      <main className="app">
        <h1>Noccaro Admin Console (Mock)</h1>
        <p>Loading data...</p>
      </main>
    )
  }

  const activeSpace = snapshot.spaces.find((space) => space.id === snapshot.activeSpaceId)
  const currentUser = snapshot.users.find((user) => user.id === snapshot.currentUserId)

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Noccaro Admin Console (Mock)</h1>
          <p>Backend connection is stubbed. All actions mutate local in-memory state only.</p>
        </div>
        <div className="toolbar">
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => void reset()} disabled={loading}>
            Reset Mock Data
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="meta-grid">
        <article className="card">
          <h2>Current Actor</h2>
          <p>{currentUser?.displayName}</p>
          <p className="meta">{currentUser?.email}</p>
        </article>
        <article className="card">
          <h2>Active Space</h2>
          <p>{activeSpace?.name}</p>
          <p className="meta">Code: {activeSpace?.spaceCode}</p>
        </article>
        <article className="card">
          <h2>Members</h2>
          <p>{metrics?.activeMemberCount ?? 0} active</p>
          <p className="meta">{metrics?.pendingMemberCount ?? 0} pending</p>
        </article>
        <article className="card">
          <h2>Whispers / Reports</h2>
          <p>{metrics?.activeWhisperCount ?? 0} active whispers</p>
          <p className="meta">
            {metrics?.hiddenWhisperCount ?? 0} hidden, {metrics?.openReportCount ?? 0} open reports
          </p>
        </article>
      </section>

      <section className="tables">
        <article className="card">
          <h2>Membership Snapshot</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.memberships.map((membership) => {
                const user = snapshot.users.find((item) => item.id === membership.userId)
                return (
                  <tr key={membership.id}>
                    <td>{membership.publicId}</td>
                    <td>{membership.role}</td>
                    <td>{membership.status}</td>
                    <td>{user?.displayName ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>
        <article className="card">
          <h2>Recent Member Actions</h2>
          <ul className="action-list">
            {snapshot.memberActions.slice(0, 8).map((action) => (
              <li key={action.id}>
                <span>{action.actionType}</span>
                <span className="meta">{action.reason}</span>
              </li>
            ))}
          </ul>
          <p className="meta">{lastActionAt ? `Last action: ${lastActionAt}` : 'No actions yet.'}</p>
        </article>
      </section>
    </main>
  )
}

export default App
