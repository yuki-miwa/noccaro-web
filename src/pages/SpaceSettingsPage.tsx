import { useState } from 'react'
import { useAdminContext } from '../context/AdminContext'

interface SettingsForm {
  name: string
  description: string
  spaceCode: string
  joinPolicy: 'auto_approve' | 'approval_required'
  maxOwnerCount: number
  whisperTtlMinutes: number
  whisperMaxLength: number
  locationGridMeters: number
  locationJitterEnabled: boolean
  whisperAutoHideReportThreshold: number
  whisperRateLimitPerMinute: number
  whisperRateLimitPer10Min: number
}

function toSettingsForm(space: NonNullable<ReturnType<typeof useAdminContext>['selectedSpace']>): SettingsForm {
  return {
    name: space.name,
    description: space.description ?? '',
    spaceCode: space.code,
    joinPolicy: space.joinPolicy,
    maxOwnerCount: space.maxOwnerCount,
    whisperTtlMinutes: space.whisperTtlMinutes,
    whisperMaxLength: space.whisperMaxLength,
    locationGridMeters: space.locationGridMeters,
    locationJitterEnabled: space.locationJitterEnabled,
    whisperAutoHideReportThreshold: space.whisperAutoHideReportThreshold ?? 5,
    whisperRateLimitPerMinute: space.whisperRateLimitPerMinute ?? 1,
    whisperRateLimitPer10Min: space.whisperRateLimitPer10Min ?? 3,
  }
}

export function SpaceSettingsPage() {
  const { selectedMembership, selectedSpace } = useAdminContext()

  if (!selectedSpace || !selectedMembership) {
    return <p className="page-empty">Select an admin-capable space to edit settings.</p>
  }

  return <SpaceSettingsForm key={selectedSpace.id} />
}

function SpaceSettingsForm() {
  const { loading, selectedSpace, updateSpaceSettings } = useAdminContext()
  const [form, setForm] = useState<SettingsForm>(toSettingsForm(selectedSpace!))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await updateSpaceSettings({
      name: form.name.trim(),
      description: form.description.trim() || null,
      spaceCode: form.spaceCode.trim(),
      joinPolicy: form.joinPolicy,
      maxOwnerCount: form.maxOwnerCount,
      whisperTtlMinutes: form.whisperTtlMinutes,
      whisperMaxLength: form.whisperMaxLength,
      locationGridMeters: form.locationGridMeters,
      locationJitterEnabled: form.locationJitterEnabled,
      whisperAutoHideReportThreshold: form.whisperAutoHideReportThreshold,
      whisperRateLimitPerMinute: form.whisperRateLimitPerMinute,
      whisperRateLimitPer10Min: form.whisperRateLimitPer10Min,
    })
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Space Settings</h2>
          <span>PATCH /api/v1/admin/spaces/{selectedSpace!.id}</span>
        </div>
        <form className="settings-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Space Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            <span>Space Code</span>
            <input
              value={form.spaceCode}
              onChange={(event) => setForm({ ...form, spaceCode: event.target.value })}
              required
            />
          </label>
          <label className="settings-form-full">
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label>
            <span>Join Policy</span>
            <select
              value={form.joinPolicy}
              onChange={(event) =>
                setForm({
                  ...form,
                  joinPolicy: event.target.value as SettingsForm['joinPolicy'],
                })
              }
            >
              <option value="approval_required">approval_required</option>
              <option value="auto_approve">auto_approve</option>
            </select>
          </label>
          <label>
            <span>Owner Cap</span>
            <input
              type="number"
              min={1}
              value={form.maxOwnerCount}
              onChange={(event) => setForm({ ...form, maxOwnerCount: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Whisper TTL (minutes)</span>
            <input
              type="number"
              min={30}
              value={form.whisperTtlMinutes}
              onChange={(event) => setForm({ ...form, whisperTtlMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Whisper Max Length</span>
            <input
              type="number"
              min={1}
              max={30}
              value={form.whisperMaxLength}
              onChange={(event) => setForm({ ...form, whisperMaxLength: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Location Grid (m)</span>
            <input
              type="number"
              min={80}
              value={form.locationGridMeters}
              onChange={(event) => setForm({ ...form, locationGridMeters: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Auto-hide Report Threshold</span>
            <input
              type="number"
              min={1}
              value={form.whisperAutoHideReportThreshold}
              onChange={(event) =>
                setForm({
                  ...form,
                  whisperAutoHideReportThreshold: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Rate Limit per Minute</span>
            <input
              type="number"
              min={1}
              value={form.whisperRateLimitPerMinute}
              onChange={(event) => setForm({ ...form, whisperRateLimitPerMinute: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Rate Limit per 10 Minutes</span>
            <input
              type="number"
              min={1}
              value={form.whisperRateLimitPer10Min}
              onChange={(event) => setForm({ ...form, whisperRateLimitPer10Min: Number(event.target.value) })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.locationJitterEnabled}
              onChange={(event) => setForm({ ...form, locationJitterEnabled: event.target.checked })}
            />
            <span>Enable location jitter</span>
          </label>
          <button type="submit" disabled={loading}>
            Save Settings
          </button>
        </form>
      </section>
    </div>
  )
}
