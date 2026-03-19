import { StatCard } from '../../components/StatCard'
import { formatIso, reportReasonLabel, reportStatusLabel, systemSpaceStatusLabel } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'

export function SystemDashboardPage() {
  const { auditLogs, dashboard, reports, spaces } = useSystemAdminContext()

  const flaggedSpaces = spaces.filter((item) => !item.primaryOwner.userId || item.space.status === 'suspended')

  return (
    <div className="page-stack">
      <section className="panel stat-grid">
        <StatCard title="全スペース数" value={dashboard?.spaceCount ?? 0} hint="system-wide spaces" />
        <StatCard title="稼働中スペース" value={dashboard?.activeSpaceCount ?? 0} hint="status=active" />
        <StatCard title="全ユーザー数" value={dashboard?.userCount ?? 0} hint="registered accounts" />
        <StatCard title="ロック中ユーザー" value={dashboard?.lockedUserCount ?? 0} hint="status=locked" />
        <StatCard title="未対応の通報" value={dashboard?.openReportCount ?? 0} hint="cross-space moderation" />
        <StatCard title="主オーナー不在" value={dashboard?.orphanedPrimaryOwnerCount ?? 0} hint="recovery required" />
      </section>

      <section className="panel two-column-grid">
        <div>
          <div className="panel-header">
            <h2>要対応スペース</h2>
            <span>{flaggedSpaces.length}件</span>
          </div>
          {flaggedSpaces.length === 0 ? (
            <p className="empty-text">即対応が必要なスペースはありません。</p>
          ) : (
            <ul className="event-list">
              {flaggedSpaces.map((item) => (
                <li key={item.space.id}>
                  <strong>{item.space.name}</strong>
                  <span>
                    {systemSpaceStatusLabel(item.space.status)} / {item.primaryOwner.userId ? '主オーナー設定済み' : '主オーナー不在'}
                  </span>
                  <small>コード: {item.space.code}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="panel-header">
            <h2>最新監査ログ</h2>
            <span>{auditLogs.length}件</span>
          </div>
          {auditLogs.length === 0 ? (
            <p className="empty-text">監査ログはありません。</p>
          ) : (
            <ul className="event-list">
              {auditLogs.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <strong>{item.action}</strong>
                  <span>{item.message}</span>
                  <small>{formatIso(item.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>横断通報サマリー</h2>
          <span>{reports.length}件</span>
        </div>
        {reports.length === 0 ? (
          <p className="empty-text">通報はありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>スペース</th>
                <th>対象</th>
                <th>理由</th>
                <th>状態</th>
                <th>作成日時</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 5).map((item) => (
                <tr key={item.report.id}>
                  <td>{item.space.name}</td>
                  <td>{item.target.body}</td>
                  <td>{reportReasonLabel(item.report.reasonType)}</td>
                  <td>{reportStatusLabel(item.report.status)}</td>
                  <td>{formatIso(item.report.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
