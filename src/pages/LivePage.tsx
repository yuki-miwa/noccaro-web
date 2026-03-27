import { useState } from 'react'
import { LiveAreaMapPicker } from '../components/LiveAreaMapPicker'
import { useAdminContext } from '../context/AdminContext'
import type { LiveThreadScheduleResource } from '../types/api'
import { toDatetimeLocalValue, toLocalOffsetIsoString } from '../utils/datetime'
import { formatIso } from '../utils/format'

interface LiveScheduleFormState {
  startsAt: string
  endsAt: string
  areaCenterLat: string
  areaCenterLng: string
  areaRadiusM: string
}

const defaultScheduleForm: LiveScheduleFormState = {
  startsAt: '',
  endsAt: '',
  areaCenterLat: '',
  areaCenterLng: '',
  areaRadiusM: '150',
}

const scheduleStatusLabel: Record<string, string> = {
  scheduled: '予約中',
  started: '開始済み',
  expired: '終了済み',
  cancelled: '予約取消済み',
}

function toScheduleFormState(liveSchedule: LiveThreadScheduleResource | null): LiveScheduleFormState {
  if (!liveSchedule) {
    return defaultScheduleForm
  }

  return {
    startsAt: toDatetimeLocalValue(liveSchedule.startsAt),
    endsAt: toDatetimeLocalValue(liveSchedule.endsAt),
    areaCenterLat: liveSchedule.areaCenterLat.toString(),
    areaCenterLng: liveSchedule.areaCenterLng.toString(),
    areaRadiusM: liveSchedule.areaRadiusM.toString(),
  }
}

interface LiveScheduleEditorProps {
  liveSchedule: LiveThreadScheduleResource | null
  loading: boolean
  onSave: (input: {
    startsAt: string
    endsAt: string
    areaCenterLat: number
    areaCenterLng: number
    areaRadiusM: number
  }) => Promise<void>
}

function LiveScheduleEditor({ liveSchedule, loading, onSave }: LiveScheduleEditorProps) {
  const [form, setForm] = useState<LiveScheduleFormState>(() => toScheduleFormState(liveSchedule))
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)

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
    setScheduleMessage('地図上で配信エリア中心を更新しました。必要なら半径を調整して保存してください。')
    setForm((current) => ({
      ...current,
      areaCenterLat: lat.toFixed(6),
      areaCenterLng: lng.toFixed(6),
    }))
  }

  const handleSaveSchedule = async () => {
    setScheduleMessage(null)
    await onSave({
      startsAt: toLocalOffsetIsoString(form.startsAt),
      endsAt: toLocalOffsetIsoString(form.endsAt),
      areaCenterLat: Number(form.areaCenterLat),
      areaCenterLng: Number(form.areaCenterLng),
      areaRadiusM: Number(form.areaRadiusM),
    })
    setScheduleMessage('ライブスレッドの予約を保存しました。開始と終了は backend が自動で行います。')
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>開始条件</h2>
        <span>schedule + geofence</span>
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
        currentLat={null}
        currentLng={null}
        onPick={handlePickAreaCenter}
      />
      <div className="actions-grid">
        <button type="button" onClick={() => void handleSaveSchedule()} disabled={loading || !canSaveSchedule}>
          予約を保存
        </button>
      </div>
      {scheduleMessage ? <p className="success-banner">{scheduleMessage}</p> : null}
      <p className="helper-text">
        app 側では、期間内かつ geofence 内の active membership のみライブスレッドに参加できます。プライマリオーナーの配信開始も app
        端末の現在地で判定されます。
      </p>
    </section>
  )
}

export function LivePage() {
  const {
    liveSchedule,
    liveStream,
    liveThread,
    loading,
    selectedMembership,
    selectedSpace,
    refreshLiveState,
    updateLiveThreadSchedule,
    cancelLiveThreadSchedule,
  } = useAdminContext()

  if (!selectedSpace) {
    return <p className="page-empty">管理対象スペースを選択してください。</p>
  }

  const currentScheduleStatus = liveSchedule ? scheduleStatusLabel[liveSchedule.status] ?? liveSchedule.status : '未設定'
  const scheduleKey = liveSchedule ? `${liveSchedule.id}:${liveSchedule.updatedAt}` : 'live-schedule-empty'

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>ライブスレッド予約</h2>
          <span>{selectedSpace.name}</span>
        </div>
        <div className="overview-grid">
          <dl>
            <dt>スペースコード</dt>
            <dd>{selectedSpace.code}</dd>
            <dt>現在の役割</dt>
            <dd>{selectedMembership?.role ?? '-'}</dd>
            <dt>予約状態</dt>
            <dd>{currentScheduleStatus}</dd>
            <dt>予約開始</dt>
            <dd>{liveSchedule ? formatIso(liveSchedule.startsAt) : '-'}</dd>
            <dt>予約終了</dt>
            <dd>{liveSchedule ? formatIso(liveSchedule.endsAt) : '-'}</dd>
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
            <dt>ライブスレッド</dt>
            <dd>{liveThread ? `稼働中 (${formatIso(liveThread.startsAt)})` : '未稼働'}</dd>
            <dt>ライブ配信</dt>
            <dd>{liveStream.isLive ? `配信中 (${formatIso(liveStream.startedAt)})` : '停止中'}</dd>
            <dt>Playback URL</dt>
            <dd>{liveStream.playbackUrl ? <a href={liveStream.playbackUrl}>{liveStream.playbackUrl}</a> : '-'}</dd>
          </dl>
        </div>
        <div className="actions-grid">
          <button type="button" onClick={() => void refreshLiveState()} disabled={loading}>
            状態を更新
          </button>
          <button
            type="button"
            onClick={() => void cancelLiveThreadSchedule()}
            disabled={loading || !liveSchedule || liveThread !== null}
          >
            予約を取り消す
          </button>
        </div>
        <p className="helper-text">
          owner web ではライブスレッドの開始・終了操作は行いません。予約した時刻で backend が自動開始 / 自動終了し、geofence 判定は app
          端末の現在地で行います。
        </p>
      </section>

      <LiveScheduleEditor
        key={scheduleKey}
        liveSchedule={liveSchedule}
        loading={loading}
        onSave={updateLiveThreadSchedule}
      />
    </div>
  )
}
