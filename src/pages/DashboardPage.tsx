import { useAdminContext } from '../context/AdminContext'
import { StatCard } from '../components/StatCard'
import {
  formatIso,
  joinPolicyLabel,
  membershipStatusLabel,
  postStatusLabel,
  reportReasonLabel,
  reportStatusLabel,
  roleLabel,
} from '../utils/format'

export function DashboardPage() {
  const { joinRequests, members, metrics, posts, reports, selectedSpace, selectedMembership, whispers } =
    useAdminContext()

  if (!selectedSpace || !selectedMembership) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>管理対象スペースが必要です</h2>
        </div>
        <p className="empty-text">ロールが `owner` または `primary_owner` のスペースを選択してください。</p>
      </section>
    )
  }

  return (
    <div className="page-stack">
      <section className="panel stat-grid">
        <StatCard title="参加中メンバー" value={metrics.activeMemberCount} hint="GET /admin/spaces/{spaceId}/members" />
        <StatCard title="承認待ち申請" value={metrics.pendingMemberCount} hint="GET /admin/spaces/{spaceId}/join-requests" />
        <StatCard title="公開中のWhisper" value={metrics.activeWhisperCount} hint="GET /spaces/{spaceId}/whispers" />
        <StatCard title="未対応の通報" value={metrics.openReportCount} hint="GET /admin/spaces/{spaceId}/reports" />
        <StatCard title="公開中のオーナー投稿" value={metrics.publishedPostCount} hint="status=published" />
        <StatCard
          title="あなたの権限"
          value={roleLabel(selectedMembership.role)}
          hint={membershipStatusLabel(selectedMembership.status)}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>選択中のスペース</h2>
          <span>{selectedSpace.id}</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>名称</dt>
            <dd>{selectedSpace.name}</dd>
            <dt>スペースコード</dt>
            <dd>{selectedSpace.code}</dd>
            <dt>参加方式</dt>
            <dd>{joinPolicyLabel(selectedSpace.joinPolicy)}</dd>
            <dt>説明</dt>
            <dd>{selectedSpace.description ?? '-'}</dd>
          </dl>
          <dl>
            <dt>オーナー上限</dt>
            <dd>{selectedSpace.maxOwnerCount}</dd>
            <dt>Whisper TTL</dt>
            <dd>{selectedSpace.whisperTtlMinutes}分</dd>
            <dt>Whisper 最大文字数</dt>
            <dd>{selectedSpace.whisperMaxLength}</dd>
            <dt>グリッド / ジッター</dt>
            <dd>
              {selectedSpace.locationGridMeters}m / {selectedSpace.locationJitterEnabled ? '有効' : '無効'}
            </dd>
          </dl>
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>承認待ち参加申請</h2>
            <span>{joinRequests.length}</span>
          </div>
          {joinRequests.length === 0 ? (
            <p className="empty-text">承認待ちの申請はありません。</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ユーザー</th>
                  <th>メンバーシップ</th>
                  <th>申請日時</th>
                </tr>
              </thead>
              <tbody>
                {joinRequests.slice(0, 5).map((item) => (
                  <tr key={item.membership.id}>
                    <td>{item.user.displayName}</td>
                    <td>{item.membership.id}</td>
                    <td>{formatIso(item.membership.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>最新の通報</h2>
            <span>{reports.length}</span>
          </div>
          {reports.length === 0 ? (
            <p className="empty-text">通報はまだありません。</p>
          ) : (
            <ul className="event-list">
              {reports.slice(0, 5).map((item) => (
                <li key={item.report.id}>
                  <strong>{item.target.whisper?.body ?? item.report.targetType}</strong>
                  <span>
                    {reportReasonLabel(item.report.reasonType)} / {reportStatusLabel(item.report.status)}
                  </span>
                  <small>{formatIso(item.report.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>最近のオーナー投稿</h2>
            <span>{posts.length}</span>
          </div>
          {posts.length === 0 ? (
            <p className="empty-text">オーナー投稿はまだありません。</p>
          ) : (
            <ul className="event-list">
              {posts.slice(0, 5).map((post) => (
                <li key={post.id}>
                  <strong>{post.title}</strong>
                  <span>
                    {postStatusLabel(post.status)} / リアクション {post.reactionCount}件
                  </span>
                  <small>{formatIso(post.updatedAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>現在のWhisper</h2>
            <span>{whispers.length}</span>
          </div>
          {whispers.length === 0 ? (
            <p className="empty-text">公開中の Whisper はありません。</p>
          ) : (
            <ul className="event-list">
              {whispers.slice(0, 5).map((whisper) => (
                <li key={whisper.id}>
                  <strong>{whisper.body}</strong>
                  <span>通報 {whisper.reportCount}件</span>
                  <small>{formatIso(whisper.expiresAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>メンバー一覧サマリー</h2>
          <span>{members.length}人</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>権限</th>
              <th>状態</th>
              <th>ミュート</th>
              <th>利用停止</th>
            </tr>
          </thead>
          <tbody>
            {members.slice(0, 6).map((item) => (
              <tr key={item.membership.id}>
                <td>{item.user.displayName}</td>
                <td>{roleLabel(item.membership.role)}</td>
                <td>{membershipStatusLabel(item.membership.status)}</td>
                <td>{formatIso(item.membership.muteUntil)}</td>
                <td>{formatIso(item.membership.suspendedUntil)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
