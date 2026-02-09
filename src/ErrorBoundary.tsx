import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="app" style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
          <div className="card" style={{ border: '1px solid #fecaca' }}>
            <h1 style={{ color: '#b91c1c' }}>Something went wrong</h1>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              The screen could not load. Check the browser console (F12) for details.
            </p>
            <pre
              style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
