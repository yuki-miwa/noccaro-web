import { useMemo, useState } from 'react'
import { formatIso, reportReasonLabel, reportStatusLabel, resolutionLabel } from '../../utils/format'
import { useSystemAdminContext } from '../context/SystemAdminContext'
import type { ReportStatus, ResolutionType } from '../../types/api'

const statusFilters: Array<{ label: string; value: 'all' | ReportStatus }> = [
  { label: 'すべて', value: 'all' },
  { label: '未対応', value: 'open' },
  { label: '確認中', value: 'reviewing' },
  { label: '対応済み', value: 'resolved' },
  { label: '却下', value: 'rejected' },
]

const resolutionOptions: ResolutionType[] = ['no_action', 'content_removed', 'mute', 'kick', 'suspend', 'ban']

export function SystemReportsPage() {
  const { loading, reports, resolveReport } = useSystemAdminContext()
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')

  const filteredReports = useMemo(
    () => reports.filter((item) => (statusFilter === 'all' ? true : item.report.status === statusFilter)),
    [reports, statusFilter],
  )

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>横断通報一覧</h2>
          <span>{filteredReports.length}件</span>
        </div>
        <div className="filter-group">
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

        {filteredReports.length === 0 ? <p className="empty-text">通報はありません。</p> : null}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>スペース</th>
                <th>対象</th>
                <th>報告者</th>
                <th>理由</th>
                <th>状態</th>
                <th>日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((item) => (
                <tr key={item.report.id}>
                  <td>
                    <strong>{item.space.name}</strong>
                    <div className="row-subtext">{item.space.code}</div>
                  </td>
                  <td>
                    <div>{item.target.body}</div>
                    <div className="row-subtext">{item.target.id}</div>
                    {item.target.imageThumbnailUrl ? (
                      <img
                        className="whisper-thumb"
                        src={item.target.imageThumbnailUrl}
                        alt="通報対象のWhisper画像"
                        loading="lazy"
                      />
                    ) : null}
                  </td>
                  <td>
                    <div>{item.reporter.displayName}</div>
                    <div className="row-subtext">{item.reporter.email}</div>
                  </td>
                  <td>{reportReasonLabel(item.report.reasonType)}</td>
                  <td>{reportStatusLabel(item.report.status)}</td>
                  <td>{formatIso(item.report.createdAt)}</td>
                  <td>
                    {item.report.status === 'open' || item.report.status === 'reviewing' ? (
                      <div className="actions-grid">
                        {resolutionOptions.map((resolutionType) => (
                          <button
                            key={resolutionType}
                            type="button"
                            onClick={() =>
                              void resolveReport(item.report.id, {
                                resolutionType,
                                note: `system admin resolve: ${resolutionLabel(resolutionType)}`,
                              })
                            }
                            disabled={loading}
                          >
                            {resolutionLabel(resolutionType)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="row-subtext">処理済み</span>
                    )}
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
