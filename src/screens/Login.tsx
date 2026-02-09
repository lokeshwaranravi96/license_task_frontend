import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email_id, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const result = await login({ email_id, password })
      
      console.log("Login API result:", result)

      // On success, navigate to purchase screen
      if (result.success) {
        console.log("Login successful, status:", result.status)
        
        // Verify token is stored before navigation
        const token = localStorage.getItem('access_token') || localStorage.getItem('token')
        console.log("Token stored:", token ? "Yes" : "No")
        
        if (token) {
          setLoading(false)
          // Use setTimeout to ensure state updates are complete before navigation
          setTimeout(() => {
            console.log("Navigating to /purchase")
            // Try React Router navigation first, fallback to window.location if needed
            try {
              navigate('/purchase', { replace: true })
            } catch (navError) {
              console.error("Navigation error, using window.location:", navError)
              window.location.href = '/purchase'
            }
          }, 100)
        } else {
          console.error("Token not found after login, cannot navigate")
          setError('Login successful but token not stored. Please try again.')
          setLoading(false)
        }
        return
      }

      setLoading(false)

      // Handle error response (result.success is false)
      if (!result.success) {
        if (result.status === 401) {
          setError('Unauthorized. Invalid email or password.')
          return
        }
        if (result.status === 403) {
          setError('Access forbidden. You do not have permission to sign in.')
          return
        }
        if (result.status === 404) {
          setError('Account not found. Please check your credentials.')
          return
        }
        setError(result.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      setLoading(false)
      console.error('Unexpected error during login:', err)
      setError('An unexpected error occurred. Please check the console for details.')
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: '3rem' }}>
        <h1>Login</h1>
        <form onSubmit={handleSubmit} autoComplete="on" method="post">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email_id}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username email"
              placeholder="Enter your email address"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
