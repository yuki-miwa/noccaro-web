import { NavLink, Outlet } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'
import { roleLabel } from '../utils/format'

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/space-settings', label: 'Space Settings' },
  { to: '/members', label: 'Members' },
  { to: '/posts', label: 'Posts' },
  { to: '/whispers', label: 'Whispers' },
  { to: '/reports', label: 'Reports' },
]

export function AdminLayout() {
  const {
    adminSpaces,
    error,
    joinedSpaces,
    loading,
    logout,
    refresh,
    resetMock,
    selectedMembership,
    selectedSpace,
    selectedSpaceId,
    selectSpace,
    serviceMode,
    user,
  } = useAdminContext()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Noccaro</h1>
          <p>{serviceMode === 'mock' ? 'Admin Contract Mock' : 'Admin API Console'}</p>
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
            <p className="eyebrow">Signed in as</p>
            <h2>{user?.displayName ?? 'Unknown user'}</h2>
            <p>
              {user?.email ?? '-'}
              {selectedMembership ? ` / ${roleLabel(selectedMembership.role)}` : ''}
            </p>
            <small>
              {selectedSpace ? `Space code: ${selectedSpace.code}` : 'No admin-capable space is currently selected.'}
            </small>
          </div>

          <div className="topbar-actions">
            <label className="select-field">
              <span>Selected space</span>
              <select
                value={selectedSpaceId ?? ''}
                onChange={(event) => void selectSpace(event.target.value)}
                disabled={loading || adminSpaces.length === 0}
              >
                {adminSpaces.length === 0 ? <option value="">No admin spaces</option> : null}
                {adminSpaces.map((item) => (
                  <option key={item.space.id} value={item.space.id}>
                    {item.space.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
            {serviceMode === 'mock' ? (
              <button type="button" onClick={() => void resetMock()} disabled={loading}>
                Reset Mock
              </button>
            ) : null}
            <button type="button" onClick={() => void logout()} disabled={loading}>
              Logout
            </button>
          </div>
        </header>

        {joinedSpaces.length > 0 && adminSpaces.length === 0 ? (
          <p className="warning-banner">The current account belongs to spaces, but none of them has owner privileges.</p>
        ) : null}
        {error ? <p className="error-banner">{error}</p> : null}

        <Outlet />
      </main>
    </div>
  )
}
