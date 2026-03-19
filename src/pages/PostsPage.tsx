import { useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso } from '../utils/format'

interface PostFormState {
  title: string
  body: string
  status: 'draft' | 'published'
  notifyMembers: boolean
}

const initialForm: PostFormState = {
  title: '',
  body: '',
  status: 'draft',
  notifyMembers: false,
}

export function PostsPage() {
  const { archivePost, createPost, deletePost, loading, posts, publishPost, selectedSpace, updatePost } =
    useAdminContext()
  const [form, setForm] = useState<PostFormState>(initialForm)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  if (!selectedSpace) {
    return <p className="page-empty">Select an admin-capable space to manage owner posts.</p>
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      return
    }

    if (editingPostId) {
      await updatePost(editingPostId, {
        title: form.title.trim(),
        body: form.body.trim(),
        notifyMembers: form.notifyMembers,
        status: form.status,
      })
    } else {
      await createPost({
        title: form.title.trim(),
        body: form.body.trim(),
        notifyMembers: form.notifyMembers,
        status: form.status,
      })
    }

    setEditingPostId(null)
    setForm(initialForm)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>{editingPostId ? 'Edit Owner Post' : 'Create Owner Post'}</h2>
          <span>{editingPostId ? `PATCH /api/v1/admin/posts/${editingPostId}` : `POST /api/v1/admin/spaces/${selectedSpace.id}/posts`}</span>
        </div>
        <form className="post-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Title</span>
            <input
              type="text"
              maxLength={200}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              rows={6}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as PostFormState['status'],
                })
              }
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.notifyMembers}
              onChange={(event) => setForm({ ...form, notifyMembers: event.target.checked })}
            />
            <span>notifyMembers</span>
          </label>
          <div className="actions-grid">
            <button type="submit" disabled={loading || !form.title.trim() || !form.body.trim()}>
              {editingPostId ? 'Save Changes' : 'Create Post'}
            </button>
            {editingPostId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingPostId(null)
                  setForm(initialForm)
                }}
                disabled={loading}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Owner Posts</h2>
          <span>{posts.length} items</span>
        </div>
        {posts.length === 0 ? (
          <p className="empty-text">No owner posts yet.</p>
        ) : (
          <div className="stack-list">
            {posts.map((post) => (
              <article key={post.id} className="entry-card">
                <header>
                  <strong>{post.title}</strong>
                  <span className={`status-pill status-${post.status}`}>{post.status}</span>
                </header>
                <p>{post.body}</p>
                <footer>
                  <small>
                    created {formatIso(post.createdAt)} / updated {formatIso(post.updatedAt)} / reactions {post.reactionCount}
                  </small>
                  <small>{post.notifyMembers ? 'notifyMembers=true' : 'notifyMembers=false'}</small>
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
                      })
                    }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  {post.status !== 'published' ? (
                    <button type="button" onClick={() => void publishPost(post.id, true)} disabled={loading}>
                      Publish
                    </button>
                  ) : null}
                  {post.status !== 'archived' && post.status !== 'deleted' ? (
                    <button type="button" onClick={() => void archivePost(post.id)} disabled={loading}>
                      Archive
                    </button>
                  ) : null}
                  {post.status !== 'deleted' ? (
                    <button type="button" onClick={() => void deletePost(post.id)} disabled={loading}>
                      Delete
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
