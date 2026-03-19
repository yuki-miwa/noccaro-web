import { useAdminContext } from '../context/AdminContext'
import { formatIso, whisperStatusLabel } from '../utils/format'

export function WhispersPage() {
  const { loading, removeWhisper, selectedSpace, whispers } = useAdminContext()

  if (!selectedSpace) {
    return <p className="page-empty">Select an admin-capable space to review whispers.</p>
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Active Whispers</h2>
          <span>GET /api/v1/spaces/{selectedSpace.id}/whispers</span>
        </div>
        <p className="empty-text">
          The current contract exposes active whispers through the public whisper list API. Hidden or removed whispers
          are primarily reviewed via the Reports screen.
        </p>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Body</th>
                <th>Status</th>
                <th>Display Coordinates</th>
                <th>Reports</th>
                <th>Expires At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {whispers.map((whisper) => (
                <tr key={whisper.id}>
                  <td>{whisper.id}</td>
                  <td>{whisper.body}</td>
                  <td>{whisperStatusLabel(whisper.status)}</td>
                  <td>
                    <div className="row-subtext">
                      {whisper.displayLat.toFixed(5)}, {whisper.displayLng.toFixed(5)}
                    </div>
                    <div className="row-subtext">radius={whisper.displayRadiusM}m</div>
                  </td>
                  <td>{whisper.reportCount}</td>
                  <td>{formatIso(whisper.expiresAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void removeWhisper(whisper.id, 'Removed from whispers moderation screen')}
                      disabled={loading}
                    >
                      Remove
                    </button>
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
