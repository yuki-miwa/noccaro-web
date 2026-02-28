import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'
import { formatIso, reportStatusLabel } from '../utils/format'
import type { ReportStatus, ResolutionType } from '../types/domain'

const reportFilters: Array<{ label: string; value: 'all' | ReportStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' },
]

const resolutionOptions: Array<{ label: string; value: ResolutionType | null }> = [
  { label: 'mute', value: 'mute' },
  { label: 'kick', value: 'kick' },
  { label: 'suspend', value: 'suspend' },
  { label: 'ban', value: 'ban' },
]

export function ReportsPage() {
  const { snapshot, loading, resolveReport } = useAdminContext()
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')

  const reports = useMemo(() => {
    const allReports = snapshot?.reports ?? []
    const activeSpaceId = snapshot?.activeSpaceId
    return allReports
      .filter((report) => report.spaceId === activeSpaceId)
      .filter((report) => (statusFilter === 'all' ? true : report.status === statusFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [snapshot, statusFilter])

  if (!snapshot) {
    return <p className="page-empty">Loading reports...</p>
  }

  const runResolve = async (
    reportId: number,
    status: 'resolved' | 'rejected',
    resolutionType: ResolutionType | null,
  ) => {
    await resolveReport({
      reportId,
      status,
      resolutionType,
      note: `Handled from reports screen (${resolutionType ?? 'none'})`,
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Report Triage</h2>
          <span>{reports.length} reports</span>
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
                <th>Target</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Detail</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const reporter = snapshot.memberships.find(
                  (membership) => membership.id === report.reporterMembershipId,
                )
                const reporterUser = snapshot.users.find((user) => user.id === reporter?.userId)

                return (
                  <tr key={report.id}>
                    <td>
                      <div>{report.publicId}</div>
                      <div className="row-subtext">by {reporterUser?.displayName ?? report.reporterMembershipId}</div>
                    </td>
                    <td>
                      {report.targetType}:{report.targetId}
                    </td>
                    <td>{report.reasonType}</td>
                    <td>{reportStatusLabel(report.status)}</td>
                    <td>{report.detail}</td>
                    <td>{formatIso(report.createdAt)}</td>
                    <td>
                      {report.status === 'open' || report.status === 'reviewing' ? (
                        <div className="actions-grid">
                          <button
                            type="button"
                            onClick={() => void runResolve(report.id, 'resolved', 'no_action')}
                            disabled={loading}
                          >
                            Resolve No Action
                          </button>
                          <button
                            type="button"
                            onClick={() => void runResolve(report.id, 'resolved', 'content_removed')}
                            disabled={loading}
                          >
                            Resolve Remove Content
                          </button>
                          {resolutionOptions.map((option) => (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => void runResolve(report.id, 'resolved', option.value)}
                              disabled={loading}
                            >
                              Resolve {option.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => void runResolve(report.id, 'rejected', null)}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="row-subtext">Handled at: {formatIso(report.handledAt)}</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
