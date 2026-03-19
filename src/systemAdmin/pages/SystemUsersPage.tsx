import { useMemo, useState } from 'react'
import { userStatusLabel } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'

const statusFilters: Array<{ label: string; value: 'all' | 'active' | 'locked' | 'deleted' }> = [
  { label: 'すべて', value: 'all' },
  { label: '有効', value: 'active' },
  { label: 'ロック中', value: 'locked' },
  { label: '削除済み', value: 'deleted' },
]

export function SystemUsersPage() {
  const { loading, updateUser, users } = useSystemAdminContext()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked' | 'deleted'>('all')

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return users.filter((item) => {
      const matchesStatus = statusFilter === 'all' ? true : item.user.status === statusFilter
      const haystack = `${item.user.displayName} ${item.user.email} ${item.user.id}`.toLowerCase()
      const matchesSearch = normalized ? haystack.includes(normalized) : true
      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, users])

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>ユーザー一覧</h2>
          <span>{filteredUsers.length}件</span>
        </div>
        <div className="members-toolbar">
          <div className="filter-group" role="tablist" aria-label="ユーザー状態フィルター">
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
          <input className="search-input" placeholder="名前・メールアドレス・ID で検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>状態</th>
                <th>所属スペース</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.user.id}>
                  <td>
                    <strong>{item.user.displayName}</strong>
                    <div className="row-subtext">{item.user.email}</div>
                    <div className="row-subtext">{item.user.id}</div>
                  </td>
                  <td>{userStatusLabel(item.user.status)}</td>
                  <td>
                    {item.memberships.length === 0 ? (
                      <span className="row-subtext">所属なし</span>
                    ) : (
                      item.memberships.map((membership) => (
                        <div key={membership.membershipId} className="row-subtext">
                          {membership.spaceName} / {membership.role} / {membership.status}
                        </div>
                      ))
                    )}
                  </td>
                  <td>
                    <div className="actions-grid">
                      {item.user.status === 'deleted' ? (
                        <span className="row-subtext">削除済み</span>
                      ) : item.user.status !== 'locked' ? (
                        <button type="button" onClick={() => void updateUser(item.user.id, { status: 'locked', note: 'manual safety lock' })} disabled={loading}>
                          ロック
                        </button>
                      ) : (
                        <button type="button" onClick={() => void updateUser(item.user.id, { status: 'active', note: 'manual unlock' })} disabled={loading}>
                          ロック解除
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
