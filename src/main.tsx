import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import App from './App'
import { setAuthToken } from './api/client'
import './App.css'

// Check for access_token first (new format), then fallback to token (legacy)
const token = localStorage.getItem('access_token') || localStorage.getItem('token')
if (token) setAuthToken(token)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
