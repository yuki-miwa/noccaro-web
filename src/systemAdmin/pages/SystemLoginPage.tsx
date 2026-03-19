import { useState } from 'react'
import { useSystemAdminContext } from '../context/SystemAdminContext'

export function SystemLoginPage() {
  const { login, loading, error } = useSystemAdminContext()
  const [email, setEmail] = useState('sysadmin@noccaro.local')
  const [password, setPassword] = useState('password123')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await login(email.trim(), password)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-system">
        <div className="auth-copy">
          <p className="eyebrow">Noccaro System Admin</p>
          <h1>内部運用コンソール</h1>
          <p>
            スペース作成、初期主オーナー設定、ユーザー保護、全スペース横断の監視を担当する内部向け画面です。
          </p>
          <div className="auth-note">
            <strong>モックログイン</strong>
            <span>`sysadmin@noccaro.local` / `password123`</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>メールアドレス</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>パスワード</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <p className="error-banner">{error}</p> : null}
          <button type="submit" disabled={loading || !email.trim() || !password}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </section>
    </main>
  )
}
