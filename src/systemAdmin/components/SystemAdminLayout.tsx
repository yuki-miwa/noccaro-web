import { NavLink, Outlet } from 'react-router-dom'
import { useSystemAdminContext } from '../context/SystemAdminContext'

const navigationItems = [
  { to: '/system-admin/dashboard', label: 'ダッシュボード' },
  { to: '/system-admin/spaces', label: 'スペース管理' },
  { to: '/system-admin/posts', label: '運営お知らせ' },
  { to: '/system-admin/live', label: 'ライブ監視' },
  { to: '/system-admin/users', label: 'ユーザー管理' },
  { to: '/system-admin/reports', label: '横断通報' },
  { to: '/system-admin/audit', label: '監査ログ' },
]

export function SystemAdminLayout() {
  const { error, loading, logout, refresh, resetMock, serviceMode, user } = useSystemAdminContext()

  return (
    <div className="shell">
      <aside className="sidebar sidebar-system">
        <div className="sidebar-brand">
          <h1>Noccaro</h1>
          <p>{serviceMode === 'mock' ? 'システム管理モック' : 'システム管理API接続'}</p>
        </div>
        <nav className="sidebar-nav" aria-label="システム管理ナビゲーション">
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
            <p className="eyebrow">システム管理者</p>
            <h2>{user?.displayName ?? '不明なユーザー'}</h2>
            <p>{user?.email ?? '-'}</p>
            <small>システム運用・スペース作成・主オーナー復旧を担当する内部画面です。</small>
          </div>

          <div className="topbar-actions">
            <button type="button" onClick={() => void refresh()} disabled={loading}>
              更新
            </button>
            {serviceMode === 'mock' ? (
              <button type="button" onClick={() => void resetMock()} disabled={loading}>
                モック初期化
              </button>
            ) : null}
            <button type="button" onClick={() => void logout()} disabled={loading}>
              ログアウト
            </button>
          </div>
        </header>

        {error ? <p className="error-banner">{error}</p> : null}
        <Outlet />
      </main>
    </div>
  )
}
