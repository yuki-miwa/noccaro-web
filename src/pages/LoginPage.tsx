import { useState } from 'react'
import { useAdminContext } from '../context/AdminContext'

export function LoginPage() {
  const { login, loading, error, serviceMode } = useAdminContext()
  const [email, setEmail] = useState(serviceMode === 'mock' ? 'primary-owner@noccaro.local' : '')
  const [password, setPassword] = useState(serviceMode === 'mock' ? 'password123' : '')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await login(email.trim(), password)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Noccaro 管理画面</p>
          <h1>コミュニティ運営コンソール</h1>
          <p>
            承認済みの `Bearer token` フローで起動し、スペース単位の管理データを API 契約に沿って読み込む
            管理画面です。
          </p>
          {serviceMode === 'mock' ? (
            <div className="auth-note">
              <strong>モックログイン</strong>
              <span>`primary-owner@noccaro.local` / `password123`</span>
            </div>
          ) : null}
        </div>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>メールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
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
