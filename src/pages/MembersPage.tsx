import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, membershipStatusLabel, roleLabel } from '../utils/format'
import type { MembershipStatus } from '../types/api'

const statusFilters: Array<{ label: string; value: 'all' | MembershipStatus }> = [
  { label: 'すべて', value: 'all' },
  { label: '承認待ち', value: 'pending' },
  { label: '参加中', value: 'active' },
  { label: '利用停止', value: 'suspended' },
  { label: 'BAN', value: 'banned' },
  { label: '強制退出', value: 'kicked' },
  { label: '退会', value: 'left' },
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
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  const runMute = async (membershipId: string) => {
    const hours = Number(window.prompt('ミュート時間を入力してください（時間）', '24') ?? '24')
    const muteUntil = hoursFromNowIso(Number.isNaN(hours) || hours <= 0 ? 24 : hours)
    await patchMembership(membershipId, {
      muteUntil,
      reason: 'メンバー管理画面からミュート',
    })
  }

  const runSuspend = async (membershipId: string) => {
    const hours = Number(window.prompt('利用停止時間を入力してください（時間）', '72') ?? '72')
    const suspendedUntil = hoursFromNowIso(Number.isNaN(hours) || hours <= 0 ? 72 : hours)
    await patchMembership(membershipId, {
      status: 'suspended',
      suspendedUntil,
      reason: 'メンバー管理画面から利用停止',
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>承認待ち参加申請</h2>
          <span>{joinRequests.length}</span>
        </div>
        {joinRequests.length === 0 ? (
          <p className="empty-text">承認待ち申請はありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>メンバーシップ</th>
                <th>申請日時</th>
                <th>操作</th>
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
                        承認
                      </button>
                      <button type="button" onClick={() => void rejectMembership(item.membership.id)} disabled={loading}>
                        却下
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
          <h2>メンバー管理</h2>
          <span>
            オーナー {activeOwnerCount}/{selectedSpace.maxOwnerCount}
          </span>
        </div>

        <div className="members-toolbar">
          <div className="filter-group" role="tablist" aria-label="メンバー状態フィルター">
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
            placeholder="名前・メールアドレス・メンバーシップIDで検索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>権限</th>
                <th>状態</th>
                <th>参加日時</th>
                <th>制限</th>
                <th>操作</th>
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
                      <div className="row-subtext">ミュート期限: {formatIso(item.membership.muteUntil)}</div>
                      <div className="row-subtext">利用停止期限: {formatIso(item.membership.suspendedUntil)}</div>
                      <div className="row-subtext">BAN日時: {formatIso(item.membership.bannedAt)}</div>
                    </td>
                    <td>
                      <div className="actions-grid">
                        {canPromote && item.membership.role === 'guest' ? (
                          <button
                            type="button"
                            onClick={() => void patchMembership(item.membership.id, { role: 'owner', reason: 'オーナー権限を付与' })}
                            disabled={loading}
                          >
                            オーナー付与
                          </button>
                        ) : null}
                        {canPromote && item.membership.role === 'owner' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void patchMembership(item.membership.id, { role: 'guest', reason: 'オーナー権限を解除' })}
                              disabled={loading}
                            >
                              オーナー解除
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patchMembership(item.membership.id, {
                                  role: 'primary_owner',
                                  reason: '主オーナー権限を移譲',
                                })
                              }
                              disabled={loading}
                            >
                              主オーナー移譲
                            </button>
                          </>
                        ) : null}

                        {canModerate && item.membership.status === 'active' ? (
                          <>
                            <button type="button" onClick={() => void runMute(item.membership.id)} disabled={loading}>
                              ミュート
                            </button>
                            <button type="button" onClick={() => void runSuspend(item.membership.id)} disabled={loading}>
                              利用停止
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patchMembership(item.membership.id, {
                                  status: 'kicked',
                                  reason: 'メンバー管理画面から強制退出',
                                })
                              }
                              disabled={loading}
                            >
                              強制退出
                            </button>
                          </>
                        ) : null}

                        {item.membership.muteUntil && canModerate ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                muteUntil: null,
                                reason: 'ミュートを解除',
                              })
                            }
                            disabled={loading}
                          >
                            ミュート解除
                          </button>
                        ) : null}

                        {item.membership.status === 'suspended' && canModerate ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'active',
                                reason: '利用停止を解除',
                              })
                            }
                            disabled={loading}
                          >
                            利用停止解除
                          </button>
                        ) : null}

                        {canBan && item.membership.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'banned',
                                reason: 'BANを実行',
                              })
                            }
                            disabled={loading}
                          >
                            BAN
                          </button>
                        ) : null}

                        {canBan && item.membership.status === 'banned' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void patchMembership(item.membership.id, {
                                status: 'active',
                                reason: 'BANを解除',
                              })
                            }
                            disabled={loading}
                          >
                            BAN解除
                          </button>
                        ) : null}

                        {isPrimary ? <span className="row-subtext">主オーナーは保護されています</span> : null}
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
