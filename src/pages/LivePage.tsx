import { useEffect, useState } from 'react'
import { LiveAreaMapPicker } from '../components/LiveAreaMapPicker'
import { useAdminContext } from '../context/AdminContext'
import { toDatetimeLocalValue, toLocalOffsetIsoString } from '../utils/datetime'
import { formatIso } from '../utils/format'
import type { LiveLocationInput } from '../services/adminService'

interface LiveScheduleFormState {
  startsAt: string
  endsAt: string
  areaCenterLat: string
  areaCenterLng: string
  areaRadiusM: string
}

interface BrowserLocationState extends LiveLocationInput {
  accuracyM: number | null
  checkedAt: string
}

const defaultScheduleForm: LiveScheduleFormState = {
  startsAt: '',
  endsAt: '',
  areaCenterLat: '',
  areaCenterLng: '',
  areaRadiusM: '150',
}

const eligibilityLabel: Record<string, string> = {
  FORBIDDEN: 'プライマリオーナーの active membership が必要です。',
  LIVE_THREAD_SCHEDULE_NOT_FOUND: '開始条件が未設定です。先にスケジュールとエリアを保存してください。',
  LIVE_THREAD_WINDOW_NOT_OPEN: '開始可能時間前です。ウィンドウが開いてから開始してください。',
  LIVE_THREAD_WINDOW_EXPIRED: '開始可能時間を過ぎています。スケジュールを更新してください。',
  LIVE_THREAD_OUT_OF_AREA: '開始エリア外です。設定した半径の内側に入ってから開始してください。',
  LIVE_THREAD_ALREADY_ACTIVE: 'ライブスレッドはすでに開始済みです。',
}

function formatDistance(distanceMeters: number | null | undefined): string {
  if (distanceMeters === null || distanceMeters === undefined) {
    return '-'
  }
  return `${distanceMeters.toFixed(1)} m`
}

function requestBrowserLocation(): Promise<BrowserLocationState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('このブラウザでは位置情報を取得できません。')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          currentLat: position.coords.latitude,
          currentLng: position.coords.longitude,
          accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          checkedAt: new Date().toISOString(),
        })
      },
      () => reject(new Error('位置情報の取得に失敗しました。ブラウザの許可設定を確認してください。')),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  })
}

export function LivePage() {
  const {
    liveBroadcast,
    liveEligibility,
    livePermissions,
    liveSchedule,
    liveStream,
    liveThread,
    loading,
    selectedMembership,
    selectedSpace,
    refreshLiveState,
    updateLiveThreadSchedule,
    startLiveStream,
    startLiveThread,
    endLiveStream,
    closeLiveThread,
  } = useAdminContext()

  const [form, setForm] = useState<LiveScheduleFormState>(defaultScheduleForm)
  const [location, setLocation] = useState<BrowserLocationState | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!liveSchedule) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(defaultScheduleForm)
      return
    }

    setForm({
      startsAt: toDatetimeLocalValue(liveSchedule.startsAt),
      endsAt: toDatetimeLocalValue(liveSchedule.endsAt),
      areaCenterLat: liveSchedule.areaCenterLat.toString(),
      areaCenterLng: liveSchedule.areaCenterLng.toString(),
      areaRadiusM: liveSchedule.areaRadiusM.toString(),
    })
  }, [liveSchedule])

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  const currentEligibilityMessage = liveEligibility?.reasonCode
    ? eligibilityLabel[liveEligibility.reasonCode] ?? liveEligibility.reasonCode
    : liveEligibility?.canStartThreadNow
      ? '現在地と時間条件を満たしています。ライブスレッドを開始できます。'
      : '位置確認前です。必要なら現在地で開始可否を確認してください。'
  const startAreaState =
    liveEligibility?.insideStartArea === null
      ? '未判定'
      : liveEligibility?.insideStartArea
        ? 'エリア内'
        : 'エリア外'

  const canSaveSchedule = Boolean(
    form.startsAt && form.endsAt && form.areaCenterLat && form.areaCenterLng && form.areaRadiusM,
  )
  const centerLat = form.areaCenterLat ? Number(form.areaCenterLat) : null
  const centerLng = form.areaCenterLng ? Number(form.areaCenterLng) : null
  const radiusM = form.areaRadiusM ? Number(form.areaRadiusM) : 150

  const handleScheduleField = (field: keyof LiveScheduleFormState, value: string) => {
    setScheduleMessage(null)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handlePickAreaCenter = (lat: number, lng: number) => {
    setScheduleMessage('地図上で開始エリア中心を更新しました。必要なら半径を調整して保存してください。')
    setForm((current) => ({
      ...current,
      areaCenterLat: lat.toFixed(6),
      areaCenterLng: lng.toFixed(6),
    }))
  }

  const resolveLocation = async () => {
    setLocationError(null)
    const nextLocation = await requestBrowserLocation()
    setLocation(nextLocation)
    return nextLocation
  }

  const handleCheckEligibility = async () => {
    const nextLocation = await resolveLocation()
    await refreshLiveState(nextLocation)
  }

  const handleUseCurrentLocationForArea = async () => {
    const nextLocation = await resolveLocation()
    setForm((current) => ({
      ...current,
      areaCenterLat: nextLocation.currentLat.toFixed(6),
      areaCenterLng: nextLocation.currentLng.toFixed(6),
    }))
    setScheduleMessage('現在地を開始エリア中心に反映しました。必要なら半径を調整して保存してください。')
  }

  const handleSaveSchedule = async () => {
    setScheduleMessage(null)
    await updateLiveThreadSchedule({
      startsAt: toLocalOffsetIsoString(form.startsAt),
      endsAt: toLocalOffsetIsoString(form.endsAt),
      areaCenterLat: Number(form.areaCenterLat),
      areaCenterLng: Number(form.areaCenterLng),
      areaRadiusM: Number(form.areaRadiusM),
    })
    setScheduleMessage('ライブスレッドの開始条件を保存しました。')
  }

  const handleStartThread = async () => {
    const nextLocation = await resolveLocation()
    await startLiveThread(nextLocation)
  }

  const handleAction = async (task: () => Promise<void>) => {
    try {
      await task()
    } catch (error) {
      if (error instanceof Error && error.message.includes('位置情報')) {
        setLocationError(error.message)
      }
    }
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
            <dt>スレッド開始可否</dt>
            <dd>{livePermissions?.canStartThread ? '権限あり' : '権限なし'}</dd>
            <dt>配信開始可否</dt>
            <dd>{livePermissions?.canStartStream ? '開始可能' : '開始不可'}</dd>
          </dl>
        </div>
        <div className="actions-grid">
          <button type="button" onClick={() => void handleAction(handleCheckEligibility)} disabled={loading}>
            現在地で開始可否を確認
          </button>
          <button
            type="button"
            onClick={() => void handleAction(handleStartThread)}
            disabled={loading || !livePermissions?.canStartThread}
          >
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
        {locationError ? <p className="warning-banner">{locationError}</p> : null}
        {location ? (
          <div className="live-location-card">
            <strong>直近の位置確認</strong>
            <div>
              緯度 {location.currentLat.toFixed(6)} / 経度 {location.currentLng.toFixed(6)} / 精度{' '}
              {location.accuracyM ? `${location.accuracyM.toFixed(0)} m` : '-'}
            </div>
            <div>確認時刻: {formatIso(location.checkedAt)}</div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>開始条件</h2>
          <span>schedule + geofence</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>schedule 状態</dt>
            <dd>{liveSchedule ? liveSchedule.status : '未設定'}</dd>
            <dt>開始予定</dt>
            <dd>{liveSchedule ? formatIso(liveSchedule.startsAt) : '-'}</dd>
            <dt>終了予定</dt>
            <dd>{liveSchedule ? formatIso(liveSchedule.endsAt) : '-'}</dd>
            <dt>開始条件メッセージ</dt>
            <dd>{currentEligibilityMessage}</dd>
          </dl>
          <dl>
            <dt>開始エリア中心</dt>
            <dd>
              {liveSchedule
                ? `${liveSchedule.areaCenterLat.toFixed(6)}, ${liveSchedule.areaCenterLng.toFixed(6)}`
                : '-'}
            </dd>
            <dt>開始半径</dt>
            <dd>{liveSchedule ? `${liveSchedule.areaRadiusM} m` : '-'}</dd>
            <dt>現在地との距離</dt>
            <dd>{formatDistance(liveEligibility?.distanceMeters)}</dd>
            <dt>エリア内判定</dt>
            <dd>{startAreaState}</dd>
          </dl>
        </div>
        <div className="two-column-form">
          <label>
            <span>開始時刻</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => handleScheduleField('startsAt', event.target.value)}
            />
          </label>
          <label>
            <span>終了時刻</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => handleScheduleField('endsAt', event.target.value)}
            />
          </label>
          <label>
            <span>開始エリア中心 緯度</span>
            <input
              type="number"
              step="0.000001"
              value={form.areaCenterLat}
              onChange={(event) => handleScheduleField('areaCenterLat', event.target.value)}
            />
          </label>
          <label>
            <span>開始エリア中心 経度</span>
            <input
              type="number"
              step="0.000001"
              value={form.areaCenterLng}
              onChange={(event) => handleScheduleField('areaCenterLng', event.target.value)}
            />
          </label>
          <label>
            <span>開始半径 (m)</span>
            <input
              type="number"
              min="10"
              max="5000"
              value={form.areaRadiusM}
              onChange={(event) => handleScheduleField('areaRadiusM', event.target.value)}
            />
          </label>
        </div>
        <LiveAreaMapPicker
          centerLat={centerLat}
          centerLng={centerLng}
          radiusM={radiusM}
          currentLat={location?.currentLat ?? null}
          currentLng={location?.currentLng ?? null}
          onPick={handlePickAreaCenter}
        />
        <div className="actions-grid">
          <button type="button" onClick={() => void handleAction(handleUseCurrentLocationForArea)} disabled={loading}>
            現在地を開始エリア中心に反映
          </button>
          <button type="button" onClick={() => void handleAction(handleSaveSchedule)} disabled={loading || !canSaveSchedule}>
            開始条件を保存
          </button>
        </div>
        {scheduleMessage ? <p className="success-banner">{scheduleMessage}</p> : null}
        <p className="helper-text">
          ライブスレッドは、プライマリオーナーが active membership を持ち、開始可能時間内で、開始エリア内にいるときだけ開始できます。配信はスレッド開始後に別操作で開始します。
        </p>
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
