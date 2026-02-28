import { NavLink, Outlet } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/space-settings', label: 'Space Settings' },
  { to: '/members', label: 'Members' },
  { to: '/posts', label: 'Posts' },
  { to: '/whispers', label: 'Whispers' },
  { to: '/reports', label: 'Reports' },
]

export function AdminLayout() {
  const { snapshot, loading, error, refresh, reset, expireWhispers, lastActionAt } = useAdminContext()

  const activeSpace = snapshot?.spaces.find((space) => space.id === snapshot.activeSpaceId)
  const currentMembership = snapshot?.memberships.find(
    (membership) => membership.userId === snapshot.currentUserId && membership.spaceId === snapshot.activeSpaceId,
  )

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Noccaro</h1>
          <p>Admin Mock Console</p>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar panel">
          <div>
            <h2>{activeSpace?.name ?? 'Loading space'}</h2>
            <p>
              {activeSpace ? `Code: ${activeSpace.spaceCode}` : '-'}
              {currentMembership ? ` / Your role: ${currentMembership.role}` : ''}
            </p>
            <small>{lastActionAt ? `Last action at ${new Date(lastActionAt).toLocaleString()}` : 'No action yet.'}</small>
          </div>

          <div className="topbar-actions">
            <button type="button" onClick={() => void expireWhispers()} disabled={loading}>
              Run Expire Job
            </button>
            <button type="button" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
            <button type="button" onClick={() => void reset()} disabled={loading}>
              Reset Mock Data
            </button>
          </div>
        </header>

        {error ? <p className="error-banner">{error}</p> : null}

        <Outlet />
      </main>
    </div>
  )
}
