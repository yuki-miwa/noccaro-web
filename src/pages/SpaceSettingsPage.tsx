import { useMemo, useState } from 'react'
import { useAdminContext } from '../context/AdminContext'

interface SettingsForm {
  joinPolicy: 'auto_approve' | 'approval_required'
  maxOwnerCount: number
  locationGridMeters: number
  whisperTtlMinutes: number
  whisperRateLimitPerMinute: number
  whisperRateLimitPer10Min: number
}

function toSettingsForm(space: {
  joinPolicy: 'auto_approve' | 'approval_required'
  maxOwnerCount: number
  locationGridMeters: number
  whisperTtlMinutes: number
  whisperRateLimitPerMinute: number
  whisperRateLimitPer10Min: number
}): SettingsForm {
  return {
    joinPolicy: space.joinPolicy,
    maxOwnerCount: space.maxOwnerCount,
    locationGridMeters: space.locationGridMeters,
    whisperTtlMinutes: space.whisperTtlMinutes,
    whisperRateLimitPerMinute: space.whisperRateLimitPerMinute,
    whisperRateLimitPer10Min: space.whisperRateLimitPer10Min,
  }
}

export function SpaceSettingsPage() {
  const { snapshot, loading, updateSpaceSettings } = useAdminContext()

  const activeSpace = useMemo(
    () => snapshot?.spaces.find((space) => space.id === snapshot.activeSpaceId) ?? null,
    [snapshot],
  )

  const [form, setForm] = useState<SettingsForm | null>(activeSpace ? toSettingsForm(activeSpace) : null)

  if (!activeSpace) {
    return <p className="page-empty">Loading space settings...</p>
  }

  const effectiveForm = form ?? toSettingsForm(activeSpace)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await updateSpaceSettings(effectiveForm)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Space Settings</h2>
          <span>Primary owner only</span>
        </div>
        <form className="settings-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Join Policy</span>
            <select
              value={effectiveForm.joinPolicy}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        joinPolicy: event.target.value as SettingsForm['joinPolicy'],
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        joinPolicy: event.target.value as SettingsForm['joinPolicy'],
                      },
                )
              }
            >
              <option value="approval_required">approval_required</option>
              <option value="auto_approve">auto_approve</option>
            </select>
          </label>

          <label>
            <span>Owner Cap (excluding primary_owner)</span>
            <input
              type="number"
              min={1}
              value={effectiveForm.maxOwnerCount}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        maxOwnerCount: Number(event.target.value),
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        maxOwnerCount: Number(event.target.value),
                      },
                )
              }
            />
          </label>

          <label>
            <span>Whisper TTL (minutes)</span>
            <input
              type="number"
              min={30}
              value={effectiveForm.whisperTtlMinutes}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        whisperTtlMinutes: Number(event.target.value),
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        whisperTtlMinutes: Number(event.target.value),
                      },
                )
              }
            />
          </label>

          <label>
            <span>Whisper Rate Limit per minute</span>
            <input
              type="number"
              min={1}
              value={effectiveForm.whisperRateLimitPerMinute}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        whisperRateLimitPerMinute: Number(event.target.value),
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        whisperRateLimitPerMinute: Number(event.target.value),
                      },
                )
              }
            />
          </label>

          <label>
            <span>Whisper Rate Limit per 10 minutes</span>
            <input
              type="number"
              min={1}
              value={effectiveForm.whisperRateLimitPer10Min}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        whisperRateLimitPer10Min: Number(event.target.value),
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        whisperRateLimitPer10Min: Number(event.target.value),
                      },
                )
              }
            />
          </label>

          <label>
            <span>Location Grid Size (m)</span>
            <input
              type="number"
              min={80}
              value={effectiveForm.locationGridMeters}
              onChange={(event) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        locationGridMeters: Number(event.target.value),
                      }
                    : {
                        ...toSettingsForm(activeSpace),
                        locationGridMeters: Number(event.target.value),
                      },
                )
              }
            />
          </label>

          <button type="submit" disabled={loading}>
            Save Settings
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>In-Scope Rule Notes</h2>
        </div>
        <ul className="rule-list">
          <li>Exactly one active primary_owner per space</li>
          <li>Owner cap excludes primary_owner (DDL behavior)</li>
          <li>Whisper max length is fixed to 30</li>
          <li>Whisper auto-hide threshold defaults to 5 reports</li>
          <li>No whisper reply/reaction in MVP</li>
        </ul>
      </section>
    </div>
  )
}
