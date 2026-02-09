import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getAuthToken } from './api/client'
import { registerLogoutNavigate } from './api/client'
import Login from './screens/Login'
import LoginSuccess from './screens/LoginSuccess'
import Home from './screens/Home'
import PurchaseLicense from './screens/PurchaseLicense'
import Transactions from './screens/Transactions'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getAuthToken()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const navigate = useNavigate()
  useEffect(() => {
    registerLogoutNavigate(navigate)
    return () => registerLogoutNavigate(null)
  }, [navigate])

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/login-success"
          element={
            <ProtectedRoute>
              <LoginSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase"
          element={
            <ProtectedRoute>
              <PurchaseLicense />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
