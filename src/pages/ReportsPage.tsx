import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, reportStatusLabel } from '../utils/format'
import type { ReportStatus, ResolutionType } from '../types/api'

const reportFilters: Array<{ label: string; value: 'all' | ReportStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' },
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
    return <p className="page-empty">Select an admin-capable space to triage reports.</p>
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Reports</h2>
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

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Target Whisper</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
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
                  </td>
                  <td>
                    <div>{item.reporter.user.displayName}</div>
                    <div className="row-subtext">{item.reporter.user.email}</div>
                  </td>
                  <td>{item.report.reasonType}</td>
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
                                note: `Resolved from reports screen (${resolutionType})`,
                              })
                            }
                            disabled={loading}
                          >
                            {resolutionType}
                          </button>
                        ))}
                        {item.target.whisper ? (
                          <button
                            type="button"
                            onClick={() => void removeWhisper(item.target.whisper!.id, 'Removed from reports screen')}
                            disabled={loading}
                          >
                            Remove Whisper
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="row-subtext">Handled at: {formatIso(item.report.handledAt)}</div>
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
