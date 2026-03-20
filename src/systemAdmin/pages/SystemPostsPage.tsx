import { useMemo, useState } from 'react'
import type { PostAudienceType } from '../../types/api'
import { formatIso, postAudienceLabel, postStatusLabel } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'
import { ALL_SPACES_SCOPE, getBroadcastTargetSpaceIds, isAllSpacesScope } from '../utils/postScope'

interface PostFormState {
  title: string
  body: string
  status: 'draft' | 'published'
  notifyMembers: boolean
  audienceType: PostAudienceType
  recipientUserIds: string[]
}

const initialForm: PostFormState = {
  title: '',
  body: '',
  status: 'draft',
  notifyMembers: false,
  audienceType: 'all_members',
  recipientUserIds: [],
}

export function SystemPostsPage() {
  const {
    archivePost,
    createPost,
    deletePost,
    loading,
    postSpaceId,
    posts,
    publishPost,
    selectPostSpace,
    spaces,
    updatePost,
    users,
  } = useSystemAdminContext()
  const [form, setForm] = useState<PostFormState>(initialForm)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const isAllSpacesSelected = isAllSpacesScope(postSpaceId)
  const activeSpaceCount = useMemo(() => getBroadcastTargetSpaceIds(spaces).length, [spaces])

  const selectedSpace = useMemo(
    () => (isAllSpacesSelected ? null : spaces.find((item) => item.space.id === postSpaceId) ?? null),
    [isAllSpacesSelected, postSpaceId, spaces],
  )

  const spaceNameMap = useMemo(
    () => Object.fromEntries(spaces.map((item) => [item.space.id, item.space.name])),
    [spaces],
  )

  const recipientOptions = useMemo(
    () => {
      if (isAllSpacesSelected) {
        return []
      }

      return users
        .filter((item) =>
          item.memberships.some((membership) => membership.spaceId === postSpaceId && membership.status === 'active'),
        )
        .map((item) => {
          const membership = item.memberships.find(
            (candidate) => candidate.spaceId === postSpaceId && candidate.status === 'active',
          )
          return {
            id: item.user.id,
            name: item.user.displayName,
            detail: `${item.user.email} / ${membership?.role === 'guest' ? 'ゲスト' : '運営側'}`,
          }
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'ja'))
    },
    [isAllSpacesSelected, postSpaceId, users],
  )

  const recipientMap = useMemo(
    () => Object.fromEntries(recipientOptions.map((item) => [item.id, item])),
    [recipientOptions],
  )

  const toggleRecipient = (userId: string) => {
    setForm((current) => ({
      ...current,
      recipientUserIds: current.recipientUserIds.includes(userId)
        ? current.recipientUserIds.filter((id) => id !== userId)
        : [...current.recipientUserIds, userId],
    }))
  }

  const setAudienceType = (audienceType: PostAudienceType) => {
    if (isAllSpacesSelected && audienceType === 'targeted_users') {
      return
    }

    setForm((current) => ({
      ...current,
      audienceType,
      notifyMembers: audienceType === 'targeted_users' ? false : current.notifyMembers,
      recipientUserIds: audienceType === 'targeted_users' ? current.recipientUserIds : [],
    }))
  }

  const resetForm = () => {
    setEditingPostId(null)
    setForm(initialForm)
  }

  const handlePostScopeChange = (spaceId: string) => {
    if (editingPostId && isAllSpacesScope(spaceId)) {
      setEditingPostId(null)
    }

    if (isAllSpacesScope(spaceId)) {
      setForm((current) => ({
        ...current,
        audienceType: 'all_members',
        recipientUserIds: [],
        notifyMembers: current.notifyMembers,
      }))
    }

    void selectPostSpace(spaceId)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!postSpaceId || !form.title.trim() || !form.body.trim()) {
      return
    }

    if (!isAllSpacesSelected && form.audienceType === 'targeted_users' && form.recipientUserIds.length === 0) {
      return
    }

    const payload = {
      category: 'operation' as const,
      title: form.title.trim(),
      body: form.body.trim(),
      status: form.status,
      notifyMembers: form.audienceType === 'targeted_users' ? false : form.notifyMembers,
      audienceType: form.audienceType,
      recipientUserIds: form.audienceType === 'targeted_users' ? form.recipientUserIds : [],
    }

    if (editingPostId) {
      await updatePost(editingPostId, payload)
    } else {
      await createPost(payload)
    }

    resetForm()
  }

  const recipientSummary = (recipientUserIds?: string[]) => {
    if (!recipientUserIds || recipientUserIds.length === 0) {
      return '全メンバー向け'
    }

    const labels = recipientUserIds
      .map((userId) => recipientMap[userId]?.name ?? userId)
      .slice(0, 3)
      .join('、')

    return recipientUserIds.length > 3 ? `${labels} ほか${recipientUserIds.length - 3}名` : labels
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>{editingPostId ? '運営お知らせを編集' : '運営お知らせを作成'}</h2>
          <span>
            {editingPostId
              ? `PATCH /api/v1/system-admin/posts/${editingPostId}`
              : isAllSpacesSelected
                ? `POST /api/v1/system-admin/spaces/{spaceId}/posts × ${activeSpaceCount}件`
                : postSpaceId
                  ? `POST /api/v1/system-admin/spaces/${postSpaceId}/posts`
                : '投稿先スペースを選択してください'}
          </span>
        </div>
        <form className="post-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>投稿先スペース</span>
            <select value={postSpaceId ?? ''} onChange={(event) => handlePostScopeChange(event.target.value)}>
              {spaces.length === 0 ? <option value="">スペースがありません</option> : null}
              {spaces.length > 0 ? <option value={ALL_SPACES_SCOPE}>全稼働スペース</option> : null}
              {spaces.map((item) => (
                <option key={item.space.id} value={item.space.id}>
                  {item.space.name}
                </option>
              ))}
            </select>
          </label>
          {isAllSpacesSelected ? (
            <p className="field-hint settings-form-full">
              全稼働スペースを選ぶと、同じ運営お知らせを active な各スペースへ 1 件ずつ作成します。指定アカウント向けは使えません。
            </p>
          ) : null}
          <label>
            <span>タイトル</span>
            <input
              type="text"
              maxLength={200}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label className="settings-form-full">
            <span>本文</span>
            <textarea
              rows={6}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              required
            />
          </label>
          <label>
            <span>公開状態</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as PostFormState['status'],
                })
              }
            >
              <option value="draft">{postStatusLabel('draft')}</option>
              <option value="published">{postStatusLabel('published')}</option>
            </select>
          </label>
          <label>
            <span>配信先</span>
            <select value={form.audienceType} onChange={(event) => setAudienceType(event.target.value as PostAudienceType)}>
              <option value="all_members">全メンバー向け</option>
              <option value="targeted_users" disabled={isAllSpacesSelected}>
                指定アカウント向け
              </option>
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.notifyMembers}
              onChange={(event) => setForm({ ...form, notifyMembers: event.target.checked })}
              disabled={form.audienceType === 'targeted_users'}
            />
            <span>{form.audienceType === 'targeted_users' ? '指定アカウント向けでは通知できません' : 'メンバーに通知する'}</span>
          </label>
          {form.audienceType === 'targeted_users' && !isAllSpacesSelected ? (
            <div className="recipient-panel settings-form-full">
              <div className="recipient-panel-header">
                <strong>配信先アカウント</strong>
                <span>{form.recipientUserIds.length}件選択中</span>
              </div>
              {recipientOptions.length === 0 ? (
                <p className="empty-text">このスペースに有効メンバーがいないため、指定配信はできません。</p>
              ) : (
                <div className="recipient-list">
                  {recipientOptions.map((option) => (
                    <label key={option.id} className="recipient-item">
                      <input
                        type="checkbox"
                        checked={form.recipientUserIds.includes(option.id)}
                        onChange={() => toggleRecipient(option.id)}
                      />
                      <span>
                        <strong>{option.name}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="field-hint">指定したアカウントだけが「あなたへ」ラベル付きで受け取ります。</p>
            </div>
          ) : null}
          <div className="actions-grid">
            <button
              type="submit"
              disabled={
                loading ||
                !postSpaceId ||
                !form.title.trim() ||
                !form.body.trim() ||
                (!isAllSpacesSelected && form.audienceType === 'targeted_users' && form.recipientUserIds.length === 0)
              }
            >
              {editingPostId ? '変更を保存' : '投稿を作成'}
            </button>
            {editingPostId ? (
              <button type="button" onClick={resetForm} disabled={loading}>
                キャンセル
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>運営お知らせ一覧</h2>
          <span>
            {isAllSpacesSelected
              ? `全稼働スペース横断 / ${posts.length}件`
              : selectedSpace
                ? `${selectedSpace.space.name} / ${posts.length}件`
                : `${posts.length}件`}
          </span>
        </div>
        {posts.length === 0 ? (
          <p className="empty-text">
            {isAllSpacesSelected ? '全稼働スペース向けの運営お知らせはまだありません。' : 'このスペースの運営お知らせはまだありません。'}
          </p>
        ) : (
          <div className="stack-list">
            {posts.map((item) => {
              const { post } = item
              return (
                <article key={post.id} className="entry-card">
                  <header>
                    <div className="entry-card-title-group">
                      <strong>{post.title}</strong>
                      <div className="tag-row">
                        <span className="pill pill-strong">運営</span>
                        <span className="pill pill-muted">{postAudienceLabel(post.audienceType)}</span>
                      </div>
                    </div>
                    <span className={`status-pill status-${post.status}`}>{postStatusLabel(post.status)}</span>
                  </header>
                  <p>{post.body}</p>
                  <dl className="entry-meta-list">
                    <div>
                      <dt>投稿先</dt>
                      <dd>{spaceNameMap[post.spaceId] ?? post.spaceId}</dd>
                    </div>
                    <div>
                      <dt>配信先</dt>
                      <dd>{recipientSummary(post.recipientUserIds)}</dd>
                    </div>
                    <div>
                      <dt>作成者</dt>
                      <dd>{item.createdBySystemAdmin?.displayName ?? 'システム管理者'}</dd>
                    </div>
                    <div>
                      <dt>通知</dt>
                      <dd>{post.notifyMembers ? '通知あり' : '通知なし'}</dd>
                    </div>
                  </dl>
                  <footer>
                    <small>
                      作成 {formatIso(post.createdAt)} / 更新 {formatIso(post.updatedAt)} / 公開 {formatIso(post.publishedAt)}
                    </small>
                  </footer>
                  <div className="actions-grid top-gap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(post.id)
                        setForm({
                          title: post.title,
                          body: post.body,
                          status: post.status === 'published' ? 'published' : 'draft',
                          notifyMembers: post.notifyMembers,
                          audienceType: post.audienceType,
                          recipientUserIds: [...(post.recipientUserIds ?? [])],
                        })
                        if (post.spaceId !== postSpaceId) {
                          void selectPostSpace(post.spaceId)
                        }
                      }}
                      disabled={loading}
                    >
                      編集
                    </button>
                    {post.status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => void publishPost(post.id, post.audienceType === 'all_members' ? post.notifyMembers : false)}
                        disabled={loading}
                      >
                        公開
                      </button>
                    ) : null}
                    {post.status !== 'archived' && post.status !== 'deleted' ? (
                      <button type="button" onClick={() => void archivePost(post.id)} disabled={loading}>
                        アーカイブ
                      </button>
                    ) : null}
                    {post.status !== 'deleted' ? (
                      <button type="button" onClick={() => void deletePost(post.id)} disabled={loading}>
                        削除
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
