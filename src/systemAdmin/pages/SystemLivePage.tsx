import { useSystemAdminContext } from '../context/SystemAdminContext'
import { formatIso } from '../../utils/format'

export function SystemLivePage() {
  const { forceCloseLiveThread, forceEndLiveStream, liveSummaries, loading } = useSystemAdminContext()

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>ライブ監視</h2>
          <span>{liveSummaries.length}件</span>
        </div>
        {liveSummaries.length === 0 ? (
          <p className="empty-text">現在稼働中のライブスレッド / ライブ配信はありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>スペース</th>
                <th>主オーナー</th>
                <th>ライブスレッド</th>
                <th>ライブ配信</th>
                <th>Playback</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {liveSummaries.map((item) => (
                <tr key={item.space.id}>
                  <td>
                    <strong>{item.space.name}</strong>
                    <div>{item.space.code}</div>
                  </td>
                  <td>
                    <strong>{item.primaryOwner.displayName ?? '未設定'}</strong>
                    <div>{item.primaryOwner.email ?? '-'}</div>
                  </td>
                  <td>{item.liveThread ? `active / ${formatIso(item.liveThread.startsAt)}` : 'inactive'}</td>
                  <td>{item.liveStream.isLive ? `live / ${formatIso(item.liveStream.startedAt)}` : item.liveStream.status}</td>
                  <td>{item.liveStream.playbackUrl ? <a href={item.liveStream.playbackUrl}>再生URL</a> : '-'}</td>
                  <td>
                    <div className="actions-grid">
                      <button
                        type="button"
                        onClick={() => void forceEndLiveStream(item.space.id)}
                        disabled={loading || !item.liveStream.isLive}
                      >
                        配信を強制終了
                      </button>
                      <button
                        type="button"
                        onClick={() => void forceCloseLiveThread(item.space.id)}
                        disabled={loading || !item.liveThread}
                      >
                        スレッドを強制終了
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
