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
          <p className="eyebrow">Noccaro Admin</p>
          <h1>Owner console aligned to the backend contract</h1>
          <p>
            This admin app now boots through the approved `Bearer token` flow and loads space-scoped admin data from a
            contract-first service layer.
          </p>
          {serviceMode === 'mock' ? (
            <div className="auth-note">
              <strong>Mock login</strong>
              <span>`primary-owner@noccaro.local` / `password123`</span>
            </div>
          ) : null}
        </div>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
