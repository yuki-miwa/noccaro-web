import { useAdminContext } from '../context/AdminContext'
import { formatIso, whisperStatusLabel } from '../utils/format'

export function WhispersPage() {
  const { loading, removeWhisper, selectedSpace, whispers } = useAdminContext()

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>公開中のWhisper</h2>
          <span>GET /api/v1/spaces/{selectedSpace.id}/whispers</span>
        </div>
        <p className="empty-text">
          現在の API 契約では、公開中の Whisper は一般向け一覧 API から取得します。非表示済みや削除済みの
          Whisper は主に通報対応画面から確認します。
        </p>

        {whispers.length === 0 ? <p className="empty-text">公開中の Whisper はありません。</p> : null}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>画像</th>
                <th>本文</th>
                <th>状態</th>
                <th>表示座標</th>
                <th>通報件数</th>
                <th>掲載終了</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {whispers.map((whisper) => (
                <tr key={whisper.id}>
                  <td>{whisper.id}</td>
                  <td>
                    {whisper.image ? (
                      <img
                        className="whisper-thumb"
                        src={whisper.image.thumbnailUrl}
                        alt="Whisper 添付画像"
                        loading="lazy"
                      />
                    ) : (
                      <span className="row-subtext">なし</span>
                    )}
                  </td>
                  <td>
                    <div>{whisper.body}</div>
                    {whisper.image ? <div className="row-subtext">画像あり</div> : null}
                  </td>
                  <td>{whisperStatusLabel(whisper.status)}</td>
                  <td>
                    <div className="row-subtext">
                      {whisper.displayLat.toFixed(5)}, {whisper.displayLng.toFixed(5)}
                    </div>
                    <div className="row-subtext">表示半径 {whisper.displayRadiusM}m</div>
                  </td>
                  <td>{whisper.reportCount}</td>
                  <td>{formatIso(whisper.expiresAt)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void removeWhisper(whisper.id, 'Whisper 管理画面から削除')}
                      disabled={loading}
                    >
                      削除
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
