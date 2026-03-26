import { useAdminContext } from '../context/AdminContext'
import { formatIso } from '../utils/format'

export function LivePage() {
  const {
    liveBroadcast,
    livePermissions,
    liveStream,
    liveThread,
    loading,
    selectedMembership,
    selectedSpace,
    startLiveStream,
    startLiveThread,
    endLiveStream,
    closeLiveThread,
  } = useAdminContext()

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>ライブスレッド運用</h2>
          <span>{selectedSpace.name}</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>スペースコード</dt>
            <dd>{selectedSpace.code}</dd>
            <dt>現在の役割</dt>
            <dd>{selectedMembership?.role ?? '-'}</dd>
            <dt>ライブスレッド</dt>
            <dd>{liveThread ? `稼働中 (${formatIso(liveThread.startsAt)})` : '未開始'}</dd>
            <dt>ライブ配信</dt>
            <dd>{liveStream.isLive ? `配信中 (${formatIso(liveStream.startedAt)})` : '停止中'}</dd>
          </dl>
          <dl>
            <dt>視聴可否</dt>
            <dd>{livePermissions?.canWatch ? '視聴可能' : '視聴不可'}</dd>
            <dt>コメント可否</dt>
            <dd>{livePermissions?.canComment ? '匿名コメント可' : '匿名コメント不可'}</dd>
            <dt>配信開始可否</dt>
            <dd>{livePermissions?.canStartStream ? '開始可能' : '開始不可'}</dd>
            <dt>配信終了可否</dt>
            <dd>{livePermissions?.canEndStream ? '終了可能' : '終了不可'}</dd>
          </dl>
        </div>
        <div className="actions-grid">
          <button type="button" onClick={() => void startLiveThread()} disabled={loading || !livePermissions?.canStartThread}>
            ライブスレッド開始
          </button>
          <button type="button" onClick={() => void closeLiveThread()} disabled={loading || !livePermissions?.canCloseThread}>
            ライブスレッド終了
          </button>
          <button type="button" onClick={() => void startLiveStream()} disabled={loading || !livePermissions?.canStartStream}>
            配信開始
          </button>
          <button type="button" onClick={() => void endLiveStream()} disabled={loading || !livePermissions?.canEndStream}>
            配信終了
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>配信情報</h2>
          <span>PoC / Amazon IVS 固定リソース</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>Playback URL</dt>
            <dd>{liveStream.playbackUrl ? <a href={liveStream.playbackUrl}>{liveStream.playbackUrl}</a> : '未配信'}</dd>
            <dt>配信状態</dt>
            <dd>{liveStream.status}</dd>
            <dt>配信開始</dt>
            <dd>{formatIso(liveStream.startedAt)}</dd>
            <dt>配信終了</dt>
            <dd>{formatIso(liveStream.endedAt)}</dd>
          </dl>
          <dl>
            <dt>Ingest Endpoint</dt>
            <dd>{liveBroadcast?.ingestEndpoint ?? '配信開始後に表示'}</dd>
            <dt>Channel ARN</dt>
            <dd>{liveBroadcast?.channelArn ?? '配信開始後に表示'}</dd>
            <dt>Stream Key</dt>
            <dd>{liveBroadcast?.streamKey ?? '配信開始後に表示'}</dd>
            <dt>注意</dt>
            <dd>Stream Key は primary_owner のみが扱う運用情報です。PoC 中も外部共有しないでください。</dd>
          </dl>
        </div>
      </section>
    </div>
  )
}
