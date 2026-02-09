import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../api/auth'
import { getProfile } from '../api/profile'

export default function Profile() {
  const [status, setStatus] = useState<number | null>(null)
  const [apiStatus, setApiStatus] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getProfile().then((result) => {
      if (cancelled) return
      if (result.success) {
        setStatus(result.status)
        setApiStatus(result.api_status ?? null)
        setMessage(result.message ?? null)
        setData(result.data)
      } else {
        setError(result.message)
        setStatus(result.status ?? null)
        setApiStatus(result.api_status ?? null)
        setData(result.data ?? null)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="container">
      <nav className="nav" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/">Home</Link>
          <Link to="/purchase">Purchase License</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/profile">Profile</Link>
        </div>
        <button type="button" className="btn btn-small btn-danger" onClick={() => logout()}>
          Logout
        </button>
      </nav>
      <div className="card">
        <h1>Profile</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Your profile info as returned by the API (status, api_status, message, data).</p>

        {loading && <p>Loading…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && (
          <>
            <div className="profile-section">
              <h3>status</h3>
              <pre>{JSON.stringify(status, null, 2)}</pre>
            </div>
            <div className="profile-section">
              <h3>api_status</h3>
              <pre>{JSON.stringify(apiStatus ?? '—', null, 2)}</pre>
            </div>
            <div className="profile-section">
              <h3>message</h3>
              <pre>{JSON.stringify(message ?? '—', null, 2)}</pre>
            </div>
            <div className="profile-section">
              <h3>data ([] or {})</h3>
              <pre>{data !== undefined && data !== null ? JSON.stringify(data, null, 2) : '—'}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
