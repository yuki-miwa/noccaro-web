import { formatIso } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'

export function SystemAuditPage() {
  const { auditLogs } = useSystemAdminContext()

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>監査ログ</h2>
          <span>{auditLogs.length}件</span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="empty-text">監査ログはありません。</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>アクション</th>
                  <th>対象</th>
                  <th>内容</th>
                  <th>日時</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.action}</td>
                    <td>
                      {item.entityType} / {item.entityId}
                    </td>
                    <td>{item.message}</td>
                    <td>{formatIso(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
