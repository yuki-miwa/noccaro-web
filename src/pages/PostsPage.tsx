import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso } from '../utils/format'

export function PostsPage() {
  const { snapshot, loading, createPost } = useAdminContext()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [publishNow, setPublishNow] = useState(true)

  const reactionCountByPostId = useMemo(() => {
    const map = new Map<number, number>()
    if (!snapshot) {
      return map
    }
    for (const reaction of snapshot.postReactions) {
      map.set(reaction.postId, (map.get(reaction.postId) ?? 0) + 1)
    }
    return map
  }, [snapshot])

  if (!snapshot) {
    return <p className="page-empty">Loading posts...</p>
  }

  const posts = snapshot.posts
    .filter((post) => post.spaceId === snapshot.activeSpaceId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const notifications = snapshot.notifications
    .filter((notification) => notification.spaceId === snapshot.activeSpaceId)
    .slice(0, 8)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      return
    }

    await createPost({
      title: title.trim(),
      body: body.trim(),
      notifyMembers,
      publishNow,
    })

    setTitle('')
    setBody('')
    setNotifyMembers(true)
    setPublishNow(true)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Create Owner Article</h2>
          <span>owner / primary_owner only</span>
        </div>
        <form className="post-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Title</span>
            <input
              type="text"
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Article title"
              required
            />
          </label>
          <label>
            <span>Body</span>
            <textarea
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Article body"
              required
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
            />
            <span>Publish now</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={notifyMembers}
              onChange={(event) => setNotifyMembers(event.target.checked)}
            />
            <span>Queue push notification to active members</span>
          </label>
          <button type="submit" disabled={loading || !title.trim() || !body.trim()}>
            Save Post
          </button>
        </form>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>Posts</h2>
            <span>{posts.length} items</span>
          </div>
          <div className="stack-list">
            {posts.map((post) => {
              const authorMembership = snapshot.memberships.find(
                (membership) => membership.id === post.authorMembershipId,
              )
              const authorUser = snapshot.users.find((user) => user.id === authorMembership?.userId)

              return (
                <article key={post.id} className="entry-card">
                  <header>
                    <strong>{post.title}</strong>
                    <span className={`status-pill status-${post.status}`}>{post.status}</span>
                  </header>
                  <p>{post.body}</p>
                  <footer>
                    <small>
                      by {authorUser?.displayName ?? post.authorMembershipId} / {formatIso(post.createdAt)} / reactions:{' '}
                      {reactionCountByPostId.get(post.id) ?? 0}
                    </small>
                    <small>{post.notifyMembers ? 'notify_members=true' : 'notify_members=false'}</small>
                  </footer>
                </article>
              )
            })}
          </div>
        </div>

        <div>
          <div className="panel-header">
            <h2>Notification Queue</h2>
          </div>
          {notifications.length === 0 ? (
            <p className="empty-text">No notifications found.</p>
          ) : (
            <ul className="event-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <strong>{notification.title}</strong>
                  <span>{notification.status}</span>
                  <small>{formatIso(notification.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
