import { NavLink, Outlet } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'
import { roleLabel } from '../utils/format'

const navigationItems = [
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/space-settings', label: 'スペース設定' },
  { to: '/members', label: 'メンバー管理' },
  { to: '/posts', label: 'オーナー投稿' },
  { to: '/whispers', label: 'Whisper管理' },
  { to: '/reports', label: '通報対応' },
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
          <p>{serviceMode === 'mock' ? '管理画面モック' : '管理API接続'}</p>
        </div>
        <nav className="sidebar-nav" aria-label="メインナビゲーション">
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
            <p className="eyebrow">ログイン中</p>
            <h2>{user?.displayName ?? '不明なユーザー'}</h2>
            <p>
              {user?.email ?? '-'}
              {selectedMembership ? ` / ${roleLabel(selectedMembership.role)}` : ''}
            </p>
            <small>
              {selectedSpace ? `スペースコード: ${selectedSpace.code}` : '操作可能なスペースが選択されていません。'}
            </small>
          </div>

          <div className="topbar-actions">
            <label className="select-field">
              <span>操作対象スペース</span>
              <select
                value={selectedSpaceId ?? ''}
                onChange={(event) => void selectSpace(event.target.value)}
                disabled={loading || adminSpaces.length === 0}
              >
                {adminSpaces.length === 0 ? <option value="">管理権限のあるスペースなし</option> : null}
                {adminSpaces.map((item) => (
                  <option key={item.space.id} value={item.space.id}>
                    {item.space.name}
                  </option>
                ))}
              </select>
            </label>
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

        {joinedSpaces.length > 0 && adminSpaces.length === 0 ? (
          <p className="warning-banner">所属スペースはありますが、運営権限のあるスペースがありません。</p>
        ) : null}
        {error ? <p className="error-banner">{error}</p> : null}

        <Outlet />
      </main>
    </div>
  )
}
