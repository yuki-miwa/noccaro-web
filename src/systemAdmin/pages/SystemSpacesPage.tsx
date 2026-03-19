import { useMemo, useState } from 'react'
import { formatIso, joinPolicyLabel, systemSpaceStatusLabel, userStatusLabel } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'
import type { SystemSpaceStatus } from '../types'

interface CreateSpaceFormState {
  name: string
  description: string
  spaceCode: string
  joinPolicy: 'auto_approve' | 'approval_required'
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperMaxLength: number
  locationGridMeters: number
  locationJitterEnabled: boolean
  initialPrimaryOwnerUserId: string
}

const initialForm: CreateSpaceFormState = {
  name: '',
  description: '',
  spaceCode: '',
  joinPolicy: 'approval_required',
  maxOwnerCount: 3,
  whisperTtlMinutes: 180,
  whisperMaxLength: 30,
  locationGridMeters: 120,
  locationJitterEnabled: true,
  initialPrimaryOwnerUserId: 'user_new_006',
}

const statusFilters: Array<{ label: string; value: 'all' | SystemSpaceStatus }> = [
  { label: 'すべて', value: 'all' },
  { label: '稼働中', value: 'active' },
  { label: '停止中', value: 'suspended' },
  { label: 'アーカイブ', value: 'archived' },
  { label: '削除済み', value: 'deleted' },
]

export function SystemSpacesPage() {
  const { assignPrimaryOwner, createSpace, loading, spaces, updateSpace, users } = useSystemAdminContext()
  const [form, setForm] = useState<CreateSpaceFormState>(initialForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SystemSpaceStatus>('all')
  const [ownerSelections, setOwnerSelections] = useState<Record<string, string>>({})

  const eligibleUsers = users.filter((item) => item.user.status === 'active')

  const filteredSpaces = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return spaces.filter((item) => {
      const matchesStatus = statusFilter === 'all' ? true : item.space.status === statusFilter
      const haystack = `${item.space.name} ${item.space.code} ${item.primaryOwner.displayName ?? ''} ${item.primaryOwner.email ?? ''}`.toLowerCase()
      const matchesSearch = normalized ? haystack.includes(normalized) : true
      return matchesStatus && matchesSearch
    })
  }, [search, spaces, statusFilter])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.spaceCode.trim() || !form.initialPrimaryOwnerUserId) {
      return
    }

    await createSpace({
      name: form.name.trim(),
      description: form.description.trim() || null,
      spaceCode: form.spaceCode.trim(),
      joinPolicy: form.joinPolicy,
      maxOwnerCount: form.maxOwnerCount,
      whisperTtlMinutes: form.whisperTtlMinutes,
      whisperMaxLength: form.whisperMaxLength,
      locationGridMeters: form.locationGridMeters,
      locationJitterEnabled: form.locationJitterEnabled,
      initialPrimaryOwnerUserId: form.initialPrimaryOwnerUserId,
    })

    setForm(initialForm)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>新規スペース作成</h2>
          <span>主オーナーを同時に設定</span>
        </div>
        <form className="settings-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>スペース名</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            <span>スペースコード</span>
            <input value={form.spaceCode} onChange={(event) => setForm({ ...form, spaceCode: event.target.value })} required />
          </label>
          <label className="settings-form-full">
            <span>説明</span>
            <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label>
            <span>参加方式</span>
            <select
              value={form.joinPolicy}
              onChange={(event) => setForm({ ...form, joinPolicy: event.target.value as CreateSpaceFormState['joinPolicy'] })}
            >
              <option value="approval_required">承認制</option>
              <option value="auto_approve">自動承認</option>
            </select>
          </label>
          <label>
            <span>初期主オーナー</span>
            <select
              value={form.initialPrimaryOwnerUserId}
              onChange={(event) => setForm({ ...form, initialPrimaryOwnerUserId: event.target.value })}
            >
              {eligibleUsers.map((item) => (
                <option key={item.user.id} value={item.user.id}>
                  {item.user.displayName} ({item.user.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>オーナー上限</span>
            <input type="number" min={1} value={form.maxOwnerCount} onChange={(event) => setForm({ ...form, maxOwnerCount: Number(event.target.value) })} />
          </label>
          <label>
            <span>Whisper TTL（分）</span>
            <input type="number" min={30} value={form.whisperTtlMinutes} onChange={(event) => setForm({ ...form, whisperTtlMinutes: Number(event.target.value) })} />
          </label>
          <label>
            <span>Whisper 最大文字数</span>
            <input type="number" min={1} max={30} value={form.whisperMaxLength} onChange={(event) => setForm({ ...form, whisperMaxLength: Number(event.target.value) })} />
          </label>
          <label>
            <span>位置グリッド（m）</span>
            <input type="number" min={80} value={form.locationGridMeters} onChange={(event) => setForm({ ...form, locationGridMeters: Number(event.target.value) })} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={form.locationJitterEnabled} onChange={(event) => setForm({ ...form, locationJitterEnabled: event.target.checked })} />
            <span>位置ジッターを有効にする</span>
          </label>
          <button type="submit" disabled={loading || !form.name.trim() || !form.spaceCode.trim() || !form.initialPrimaryOwnerUserId}>
            スペースを作成
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>スペース一覧</h2>
          <span>{filteredSpaces.length}件</span>
        </div>

        <div className="members-toolbar">
          <div className="filter-group" role="tablist" aria-label="スペース状態フィルター">
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
          <input className="search-input" placeholder="スペース名・コード・主オーナーで検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>スペース</th>
                <th>主オーナー</th>
                <th>状態</th>
                <th>メトリクス</th>
                <th>作成日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpaces.map((item) => {
                const selectedOwner = ownerSelections[item.space.id] ?? item.primaryOwner.userId ?? ''
                return (
                  <tr key={item.space.id}>
                    <td>
                      <strong>{item.space.name}</strong>
                      <div className="row-subtext">コード: {item.space.code}</div>
                      <div className="row-subtext">参加方式: {joinPolicyLabel(item.space.joinPolicy)}</div>
                    </td>
                    <td>
                      <div>{item.primaryOwner.displayName ?? '未設定'}</div>
                      <div className="row-subtext">{item.primaryOwner.email ?? '主オーナー不在'}</div>
                    </td>
                    <td>{systemSpaceStatusLabel(item.space.status)}</td>
                    <td>
                      <div className="row-subtext">メンバー: {item.metrics.memberCount}人</div>
                      <div className="row-subtext">オーナー: {item.metrics.ownerCount}人</div>
                      <div className="row-subtext">未対応通報: {item.metrics.openReportCount}件</div>
                    </td>
                    <td>{formatIso(item.space.createdAt)}</td>
                    <td>
                      <div className="actions-grid">
                        {item.space.status === 'deleted' ? (
                          <span className="row-subtext">削除済み</span>
                        ) : (
                          <>
                            <select
                              className="compact-select"
                              value={selectedOwner}
                              onChange={(event) =>
                                setOwnerSelections((current) => ({
                                  ...current,
                                  [item.space.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="">主オーナーを選択</option>
                              {eligibleUsers.map((user) => (
                                <option key={user.user.id} value={user.user.id}>
                                  {user.user.displayName} / {userStatusLabel(user.user.status)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void assignPrimaryOwner(item.space.id, { userId: selectedOwner, note: 'system admin reassignment' })}
                              disabled={loading || !selectedOwner}
                            >
                              主オーナー設定
                            </button>
                            {item.space.status === 'active' ? (
                              <button type="button" onClick={() => void updateSpace(item.space.id, { status: 'suspended' })} disabled={loading}>
                                停止
                              </button>
                            ) : (
                              <button type="button" onClick={() => void updateSpace(item.space.id, { status: 'active' })} disabled={loading}>
                                再開
                              </button>
                            )}
                            {item.space.status !== 'archived' ? (
                              <button type="button" onClick={() => void updateSpace(item.space.id, { status: 'archived' })} disabled={loading}>
                                アーカイブ
                              </button>
                            ) : null}
                          </>
                        )}
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
