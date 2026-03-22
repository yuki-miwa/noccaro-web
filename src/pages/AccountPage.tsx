import { useState, type FormEvent } from 'react'
import { useAdminContext } from '../context/AdminContext'
import type { UserResource } from '../types/api'

export function AccountPage() {
  const { loading, profile, updateProfile, user } = useAdminContext()

  if (!user) {
    return <section className="panel">アカウント情報を読み込めませんでした。</section>
  }

  return (
    <AccountForm
      key={`${user.id}:${user.displayName}:${user.email}`}
      loading={loading}
      pendingEmail={profile?.pendingEmail ?? null}
      updateProfile={updateProfile}
      user={user}
    />
  )
}

interface AccountFormProps {
  loading: boolean
  pendingEmail: string | null
  updateProfile: (input: { displayName?: string; email?: string; currentPassword?: string }) => Promise<void>
  user: UserResource
}

function AccountForm({ loading, pendingEmail, updateProfile, user }: AccountFormProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    try {
      await updateProfile({
        displayName: displayName.trim(),
        email: email.trim(),
        currentPassword: emailChanged ? currentPassword : undefined,
      })

      setCurrentPassword('')
      setNotice('アカウント情報を更新しました。')
    } catch {
      setNotice(null)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">アカウント設定</p>
          <h2>プロフィール編集</h2>
          <p>表示名は即時更新されます。メールアドレス変更時のみ現在のパスワードが必要です。</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>表示名</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} />
        </label>

        <label>
          <span>メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="settings-form-full">
          <span>現在のパスワード</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            placeholder={emailChanged ? 'メール変更時は必須です' : 'メールを変更しない場合は不要です'}
          />
          <small className="field-hint">
            {pendingEmail
              ? `確認待ちメール: ${pendingEmail}`
              : '今回の実装ではメール変更は即時反映され、確認待ちメールは発生しません。'}
          </small>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存する'}
        </button>
      </form>

      {notice ? <p className="success-banner">{notice}</p> : null}
    </section>
  )
}
