import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { logout } from '../api/auth'

export default function LoginSuccess() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Auto-redirect to home after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="container">
      <div className="card" style={{ marginTop: '3rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1 style={{ color: '#059669', marginBottom: '0.5rem' }}>Login Successful!</h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            Welcome back! You have been successfully logged in.
          </p>
        </div>

        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: '#166534', margin: 0, fontWeight: '500' }}>
            ✓ Your session has been authenticated
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary" style={{ width: 'auto', margin: 0 }}>
            Go to Dashboard
          </Link>
          <Link to="/purchase" className="btn" style={{ width: 'auto', margin: 0, background: '#2563eb', color: '#fff' }}>
            Purchase License
          </Link>
        </div>

        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: 0 }}>
          Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>

        <button
          type="button"
          className="btn btn-small btn-danger"
          onClick={() => logout()}
          style={{ marginTop: '1rem' }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
