import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, reportReasonLabel, reportStatusLabel, resolutionLabel } from '../utils/format'
import type { ReportStatus, ResolutionType } from '../types/api'

const reportFilters: Array<{ label: string; value: 'all' | ReportStatus }> = [
  { label: 'すべて', value: 'all' },
  { label: '未対応', value: 'open' },
  { label: '確認中', value: 'reviewing' },
  { label: '対応済み', value: 'resolved' },
  { label: '却下', value: 'rejected' },
]

const resolutionOptions: ResolutionType[] = ['no_action', 'content_removed', 'mute', 'kick', 'suspend', 'ban']

export function ReportsPage() {
  const { loading, removeWhisper, reports, resolveReport, selectedSpace } = useAdminContext()
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')

  const filteredReports = useMemo(
    () => reports.filter((item) => (statusFilter === 'all' ? true : item.report.status === statusFilter)),
    [reports, statusFilter],
  )

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>通報一覧</h2>
          <span>GET /api/v1/admin/spaces/{selectedSpace.id}/reports</span>
        </div>

        <div className="filter-group">
          {reportFilters.map((filter) => (
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
                <th>通報</th>
                <th>対象Whisper</th>
                <th>報告者</th>
                <th>理由</th>
                <th>状態</th>
                <th>作成日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((item) => (
                <tr key={item.report.id}>
                  <td>
                    <div>{item.report.id}</div>
                    <div className="row-subtext">{item.report.detail ?? '-'}</div>
                  </td>
                  <td>
                    <div>{item.target.whisper?.body ?? item.report.targetId}</div>
                    <div className="row-subtext">{item.target.whisper?.id ?? '-'}</div>
                    {item.target.whisper?.image ? (
                      <img
                        className="whisper-thumb"
                        src={item.target.whisper.image.thumbnailUrl}
                        alt="通報対象のWhisper画像"
                        loading="lazy"
                      />
                    ) : null}
                  </td>
                  <td>
                    <div>{item.reporter.user.displayName}</div>
                    <div className="row-subtext">{item.reporter.user.email}</div>
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
                                note: `通報画面から対応: ${resolutionLabel(resolutionType)}`,
                              })
                            }
                            disabled={loading}
                          >
                            {resolutionLabel(resolutionType)}
                          </button>
                        ))}
                        {item.target.whisper ? (
                          <button
                            type="button"
                            onClick={() => void removeWhisper(item.target.whisper!.id, '通報画面から Whisper を削除')}
                            disabled={loading}
                          >
                            Whisper削除
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="row-subtext">対応日時: {formatIso(item.report.handledAt)}</div>
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
