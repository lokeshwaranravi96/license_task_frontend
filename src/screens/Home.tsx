import { Link } from 'react-router-dom'
import { logout } from '../api/auth'

export default function Home() {
  return (
    <div className="container">
      <nav className="nav" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/">Home</Link>
          <Link to="/purchase">Purchase License</Link>
          <Link to="/transactions">Transactions</Link>
        </div>
        <button type="button" className="btn btn-small btn-danger" onClick={() => logout()} style={{ marginLeft: 'auto' }}>
          Logout
        </button>
      </nav>
      <div className="card">
        <h1>Dashboard</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Welcome. Use the links above to purchase licenses or view transactions.</p>
      </div>
    </div>
  )
}
