import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import type { PostAudienceType } from '../types/api'
import { formatIso, postAudienceLabel, postStatusLabel } from '../utils/format'

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

export function PostsPage() {
  const { archivePost, createPost, deletePost, loading, members, posts, publishPost, selectedSpace, updatePost } =
    useAdminContext()
  const [form, setForm] = useState<PostFormState>(initialForm)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  const recipientOptions = useMemo(
    () =>
      members
        .filter((item) => item.membership.status === 'active')
        .map((item) => ({
          id: item.user.id,
          name: item.user.displayName,
          detail: `${item.user.email} / ${item.membership.role === 'guest' ? 'ゲスト' : '運営側'}`,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'ja')),
    [members],
  )

  const recipientMap = useMemo(
    () => Object.fromEntries(recipientOptions.map((item) => [item.id, item])),
    [recipientOptions],
  )

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  const toggleRecipient = (userId: string) => {
    setForm((current) => ({
      ...current,
      recipientUserIds: current.recipientUserIds.includes(userId)
        ? current.recipientUserIds.filter((id) => id !== userId)
        : [...current.recipientUserIds, userId],
    }))
  }

  const setAudienceType = (audienceType: PostAudienceType) => {
    setForm((current) => ({
      ...current,
      audienceType,
      recipientUserIds: audienceType === 'targeted_users' ? current.recipientUserIds : [],
    }))
  }

  const resetForm = () => {
    setEditingPostId(null)
    setForm(initialForm)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      return
    }

    if (form.audienceType === 'targeted_users' && form.recipientUserIds.length === 0) {
      return
    }

    const payload = {
      category: 'owner' as const,
      title: form.title.trim(),
      body: form.body.trim(),
      notifyMembers: form.notifyMembers,
      status: form.status,
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
          <h2>{editingPostId ? 'オーナー投稿を編集' : 'オーナー投稿を作成'}</h2>
          <span>
            {editingPostId ? `PATCH /api/v1/admin/posts/${editingPostId}` : `POST /api/v1/admin/spaces/${selectedSpace.id}/posts`}
          </span>
        </div>
        <form className="post-form" onSubmit={(event) => void submit(event)}>
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
          <label>
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
              <option value="targeted_users">指定アカウント向け</option>
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.notifyMembers}
              onChange={(event) => setForm({ ...form, notifyMembers: event.target.checked })}
            />
            <span>{form.audienceType === 'targeted_users' ? '指定したアカウントに Android Push も送る' : 'メンバーに Android Push を送る'}</span>
          </label>
          {form.audienceType === 'targeted_users' ? (
            <div className="recipient-panel">
              <div className="recipient-panel-header">
                <strong>配信先アカウント</strong>
                <span>{form.recipientUserIds.length}件選択中</span>
              </div>
              {recipientOptions.length === 0 ? (
                <p className="empty-text">配信先に指定できる有効メンバーがいません。</p>
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
              <p className="field-hint">指定したアカウントだけが、この投稿を「あなたへ」付きで受け取り、通知有効なら Android Push も送られます。</p>
            </div>
          ) : null}
          <div className="actions-grid">
            <button
              type="submit"
              disabled={
                loading ||
                !form.title.trim() ||
                !form.body.trim() ||
                (form.audienceType === 'targeted_users' && form.recipientUserIds.length === 0)
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
          <h2>オーナー投稿一覧</h2>
          <span>{posts.length}件</span>
        </div>
        {posts.length === 0 ? (
          <p className="empty-text">オーナー投稿はまだありません。</p>
        ) : (
          <div className="stack-list">
            {posts.map((post) => (
              <article key={post.id} className="entry-card">
                <header>
                  <div className="entry-card-title-group">
                    <strong>{post.title}</strong>
                    <div className="tag-row">
                      <span className="pill pill-muted">{postAudienceLabel(post.audienceType)}</span>
                      {post.audienceType === 'targeted_users' ? <span className="pill pill-soft">あなたへ表示対象あり</span> : null}
                    </div>
                  </div>
                  <span className={`status-pill status-${post.status}`}>{postStatusLabel(post.status)}</span>
                </header>
                <p>{post.body}</p>
                <dl className="entry-meta-list">
                  <div>
                    <dt>配信先</dt>
                    <dd>{recipientSummary(post.recipientUserIds)}</dd>
                  </div>
                  <div>
                    <dt>通知</dt>
                    <dd>{post.notifyMembers ? '通知あり' : '通知なし'}</dd>
                  </div>
                  <div>
                    <dt>公開</dt>
                    <dd>{formatIso(post.publishedAt)}</dd>
                  </div>
                </dl>
                <footer>
                  <small>
                    作成 {formatIso(post.createdAt)} / 更新 {formatIso(post.updatedAt)} / リアクション {post.reactionCount}件
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
                    }}
                    disabled={loading}
                  >
                    編集
                  </button>
                  {post.status !== 'published' ? (
                    <button
                      type="button"
                      onClick={() => void publishPost(post.id, post.notifyMembers)}
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
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
